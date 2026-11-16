"""Shared helpers for the Logia 3D shots. Run shots with: blender -b --factory-startup -P blender/shot_<name>.py -- [preview]"""
import json
import math
import os
import re
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "3d")
FPS = 30
PREVIEW = "preview" in sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else False


# ---------- narration beats (same lookup as src/HearV2.tsx) ----------

def _words():
    with open(os.path.join(ROOT, "src", "data", os.environ.get("LOGIA_NARR", "hear-v2.json")), encoding="utf-8") as f:
        raw = json.load(f)["words"]
    out, in_tag = [], False
    for w in raw:
        if w.get("type", "word") != "word":
            continue
        if w["text"].startswith("["):
            in_tag = True
        skip = in_tag
        if w["text"].endswith("]"):
            in_tag = False
        if not skip:
            out.append(w)
    return out


WORDS = _words()


def _norm(s):
    return re.sub(r"[^a-z']", "", s.lower().replace("’", "'"))


def seq(phrase, nth=0):
    want = [_norm(p) for p in phrase.split(" ")]
    hits = 0
    for i in range(len(WORDS) - len(want) + 1):
        if all(_norm(WORDS[i + k]["text"]) == w for k, w in enumerate(want)):
            if hits == nth:
                return WORDS[i]["start"]
            hits += 1
    raise ValueError("narration is missing " + phrase)


# ---------- scene setup ----------

def new_scene(name, seconds):
    for s in list(bpy.data.scenes):
        if s.name != "Scene":
            bpy.data.scenes.remove(s)
    sc = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sc.name = name
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = max(2, int(round(seconds * FPS)))
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = 1080
    sc.render.resolution_y = 1920
    sc.render.resolution_percentage = 50 if PREVIEW else 100
    sc.eevee.taa_render_samples = 8 if PREVIEW else 24
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    return sc


def frame(t):
    """Seconds -> frame number (shots start on frame 1)."""
    return 1 + int(round(t * FPS))


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def take(obj):
    """Move an operator-created object into the scene collection (it already is) and return it."""
    return obj


def mat(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m


def noisy_mat(name, color, bump=0.5, scale=4.0, rough=0.9, dark=0.6):
    m = mat(name, color, rough=rough)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = 10
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    nt.links.new(n.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (*color, 1)
    mix.inputs["B"].default_value = (color[0] * dark, color[1] * dark, color[2] * dark, 1)
    n2 = nt.nodes.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = scale * 0.35
    nt.links.new(n2.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return m


def emission_input(m):
    return m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]


def key_value(socket, pairs):
    """Keyframe a node socket's default_value: pairs of (seconds, value)."""
    for t, v in pairs:
        socket.default_value = v
        socket.keyframe_insert("default_value", frame=frame(t))


def key_light(light_obj, pairs):
    for t, v in pairs:
        light_obj.data.energy = v
        light_obj.data.keyframe_insert("energy", frame=frame(t))


def light(name, kind, loc, rot=(0, 0, 0), energy=100, color=(1, 1, 1), size=0.25):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if hasattr(ld, "shadow_soft_size"):
        ld.shadow_soft_size = size
    o = link(bpy.data.objects.new(name, ld))
    o.location = loc
    o.rotation_euler = rot
    return o


def camera(name, loc, rot_deg, lens=35):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    o = link(bpy.data.objects.new(name, cd))
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    bpy.context.scene.camera = o
    return o


def key_transform(obj, keys):
    """keys: list of (seconds, location or None, rotation_deg or None, scale or None)."""
    for t, loc, rot, scl in keys:
        f = frame(t)
        if loc is not None:
            obj.location = loc
            obj.keyframe_insert("location", frame=f)
        if rot is not None:
            obj.rotation_euler = tuple(math.radians(a) for a in rot)
            obj.keyframe_insert("rotation_euler", frame=f)
        if scl is not None:
            obj.scale = scl if isinstance(scl, tuple) else (scl, scl, scl)
            obj.keyframe_insert("scale", frame=f)


def world(color, strength=1.0):
    w = bpy.data.worlds.new("W")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*color, 1)
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = w
    return w


def gradient_backdrop(name, bottom, top, loc, size=(80, 60), strength=1.0, rot=(90, 0, 0)):
    """A big emissive plane with a vertical colour gradient, used as a sky."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=tuple(math.radians(a) for a in rot))
    p = bpy.context.active_object
    p.name = name
    p.scale = (size[0], size[1], 1)
    m = bpy.data.materials.new("M_" + name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*bottom, 1)
    ramp.color_ramp.elements[1].color = (*top, 1)
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    p.data.materials.append(m)
    return p, ramp


def render_mp4(name):
    sc = bpy.context.scene
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ("-preview" if PREVIEW else "") + ".mp4")
    sc.render.image_settings.media_type = "VIDEO"
    sc.render.image_settings.file_format = "FFMPEG"
    sc.render.ffmpeg.format = "MPEG4"
    sc.render.ffmpeg.codec = "H264"
    sc.render.ffmpeg.constant_rate_factor = "HIGH"
    sc.render.ffmpeg.ffmpeg_preset = "GOOD"
    sc.render.filepath = path
    bpy.ops.render.render(animation=True)
    print("RENDERED", path)


def render_still(name, t):
    sc = bpy.context.scene
    sc.frame_set(frame(t))
    path = os.path.join(ROOT, "out", "stills", "3d-" + name + ".png")
    sc.render.image_settings.media_type = "IMAGE"
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("STILL", path)


def finish(name, still_times):
    """In preview mode render stills at the given shot times; otherwise the full MP4."""
    blend = os.path.join(ROOT, "blender", name + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    if PREVIEW:
        for i, t in enumerate(still_times):
            render_still(f"{name}-{i}", t)
    else:
        render_mp4(name)
