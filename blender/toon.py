"""Cel-shaded ('toon') look with ink outlines, and the Logia main character's head built to the reference portrait:
wavy swept curly hair, thin translucent grey rectangular glasses, relaxed half-lidded eyes, thick brows,
long nose, thick moustache, stippled stubble beard along the jaw, open smile, high-collar zip jacket over a white tee.
"""
import math

import bmesh
import bpy
from mathutils import Vector

R = math.radians
INK = (0.012, 0.01, 0.01)


def toon_mat(name, color, shade=0.55, rim=0.0, emit_boost=1.0):
    """Two-band cel shading: lit colour and a darker shadow band, via Shader to RGB."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (shade, shade, shade, 1)
    ramp.color_ramp.elements[1].position = 0.18
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    mul.inputs["B"].default_value = (*color, 1)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = emit_boost
    nt.links.new(diff.outputs["BSDF"], s2r.inputs["Shader"])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["A"])
    nt.links.new(mul.outputs["Result"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    m["toon_color"] = list(color)
    return m


def stubble_mat(name, skin, hair):
    """Skin with fine dark dots, for a short beard."""
    m = toon_mat(name, skin)
    nt = m.node_tree
    mul = [n for n in nt.nodes if n.type == "MIX"][0]
    noise = nt.nodes.new("ShaderNodeTexVoronoi")
    noise.inputs["Scale"].default_value = 260
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].color = (*hair, 1)
    ramp.color_ramp.elements[1].position = 0.32
    ramp.color_ramp.elements[1].color = (*skin, 1)
    nt.links.new(noise.outputs["Distance"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["B"])
    return m


_ink = None


def ink_mat():
    global _ink
    if _ink is None:
        _ink = bpy.data.materials.new("M_ink_outline")
        _ink.use_nodes = True
        nt = _ink.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs["Color"].default_value = (*INK, 1)
        nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
        _ink.use_backface_culling = True
        try:
            _ink.use_backface_culling_shadow = True
        except Exception:
            pass
    return _ink


def outline(obj, width=0.008):
    """Inverted-hull outline: a flipped, slightly fattened shell drawn in ink with backfaces culled."""
    if obj.type != "MESH":
        return
    # Bake scale into the mesh so the outline is the same thickness all round.
    from mathutils import Matrix
    if tuple(obj.scale) != (1.0, 1.0, 1.0):
        obj.data.transform(Matrix.Diagonal((*obj.scale, 1.0)))
        for mod in obj.modifiers:
            if mod.type == "BEVEL":
                mod.width *= min(obj.scale)
        obj.scale = (1, 1, 1)
    obj.data.materials.append(ink_mat())
    sol = obj.modifiers.new("ink", "SOLIDIFY")
    sol.thickness = -width
    sol.use_flip_normals = True
    sol.use_rim = False
    sol.material_offset = len(obj.data.materials) - 1
    sol.offset = 1.0


def toonify(root, outline_width=0.008, skip=()):
    """Swap every material under root for a cel-shaded version and add ink outlines."""
    cache = {}
    def walk(o):
        yield o
        for c in o.children:
            yield from walk(c)
    for o in walk(root):
        if o.type == "CURVE":
            o.visible_shadow = False
        if o.type != "MESH" or any(s in o.name for s in skip):
            continue
        for slot in o.material_slots:
            m = slot.material
            if m is None or m.name.startswith("M_ink") or "toon_color" in m:
                continue
            if m.name not in cache:
                b = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
                col = tuple(b.inputs["Base Color"].default_value[:3]) if b else (0.5, 0.5, 0.5)
                if b and b.inputs["Alpha"].default_value < 0.9:
                    cache[m.name] = m  # keep glass as is
                    continue
                strength = b.inputs["Emission Strength"].default_value if b else 0
                cache[m.name] = toon_mat("T_" + m.name, col, emit_boost=1.0 + min(3.0, strength * 0.3))
            slot.material = cache[m.name]
        if "lens" not in o.name and "glint" not in o.name:
            outline(o, outline_width)
        # Cel shading reads cleaner without small parts casting shadow stripes across the face.
        if "_head" in (o.parent.name if o.parent else "") or any(k in o.name for k in ("_hair", "_frame", "_temple", "_bridge", "_lens", "_nose", "_brow", "_stache", "_ear", "_lid", "_pupil", "_eye", "_mouth", "_teeth", "_tongue", "_beard")):
            try:
                o.visible_shadow = False
            except Exception:
                pass


# ---------- the reference head ----------

def _sphere(name, parent, loc, scale, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2), radius=1)
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.scale = scale
    o.parent = parent
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def _tube(name, parent, pts, radius, m, closed=False):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.data.materials.append(m)
    return o


def _rounded_rect(cx, cz, w, h, r, y, n=6):
    pts = []
    corners = [(cx + w / 2 - r, cz + h / 2 - r, 0), (cx - w / 2 + r, cz + h / 2 - r, 90), (cx - w / 2 + r, cz - h / 2 + r, 180), (cx + w / 2 - r, cz - h / 2 + r, 270)]
    for x, z, a0 in corners:
        for i in range(n + 1):
            a = R(a0 + 90 * i / n)
            pts.append((x + math.cos(a) * r, y, z + math.sin(a) * r))
    return pts


def hair_mesh(name, parent, hz, m, seed=7):
    """Swept, wavy curly hair: many ellipsoids merged into one surface by a voxel remesh."""
    import random
    from mathutils import Matrix
    rnd = random.Random(seed)
    bm = bmesh.new()
    def blob(x, y, z, r, sx=1.0, sy=1.0, sz=1.0):
        mtx = Matrix.Translation((x, y, z)) @ Matrix.Diagonal((r * sx, r * sy, r * sz, 1))
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1, matrix=mtx)
    # Crown volume, taller on top and swept toward his left like the reference.
    for i in range(70):
        u = rnd.uniform(0, 2 * math.pi)
        v = rnd.uniform(0.0, 1.0)
        x = math.cos(u) * math.cos(v * 1.3) * 0.25 + 0.02
        y = math.sin(u) * math.cos(v * 1.3) * 0.23 + 0.025
        z = hz + 0.1 + math.sin(v * 1.45) * 0.19
        if y < -0.12 and z < hz + 0.19:
            continue
        blob(x, y, z, rnd.uniform(0.07, 0.1), 1.15, 1.0, 0.85)
    for sx in (1, -1):
        for k in range(4):
            blob(0.225 * sx, 0.05 + k * 0.025, hz + 0.03 + k * 0.05, 0.065, 0.8, 1.1, 1.2)
    for x, z in [(-0.16, hz + 0.19), (-0.07, hz + 0.22), (0.03, hz + 0.24), (0.12, hz + 0.22), (0.19, hz + 0.17)]:
        blob(x, -0.17, z, 0.075, 1.3, 0.85, 0.9)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    hm = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(hm)
    hm.parent = parent
    rm = hm.modifiers.new("merge", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = 0.012
    sm = hm.modifiers.new("smooth", "SMOOTH")
    sm.factor = 0.8
    sm.iterations = 6
    tex = bpy.data.textures.new(name + "_curl", "VORONOI")
    tex.noise_scale = 0.05
    d = hm.modifiers.new("curl", "DISPLACE")
    d.texture = tex
    d.strength = 0.022
    hm.data.materials.append(m)
    for p in hm.data.polygons:
        p.use_smooth = True
    return hm


def build_head(name, head, skin_c, hair_c, seed=7):
    """Builds the reference head under the 'head' pivot. Returns the animatable parts."""
    hz = 0.27
    skin = toon_mat("T_skin_" + name, skin_c)
    skin_shadow = toon_mat("T_skinshade_" + name, tuple(c * 0.78 for c in skin_c))
    hair = toon_mat("T_hair_" + name, hair_c, shade=0.6)
    white = toon_mat("T_white", (0.95, 0.94, 0.9), shade=0.85)
    black = toon_mat("T_black", INK, shade=1.0)
    mouth_in = toon_mat("T_mouthin", (0.12, 0.02, 0.02), shade=1.0)
    tongue = toon_mat("T_tongue", (0.85, 0.35, 0.38), shade=0.8)
    stub = stubble_mat("T_stubble_" + name, skin_c, hair_c)
    frame = toon_mat("T_frame", (0.42, 0.43, 0.44), shade=0.7)
    glass = bpy.data.materials.new("M_lensglass")
    glass.use_nodes = True
    gb = glass.node_tree.nodes["Principled BSDF"]
    gb.inputs["Base Color"].default_value = (0.9, 0.95, 1, 1)
    gb.inputs["Alpha"].default_value = 0.12
    gb.inputs["Roughness"].default_value = 0.35
    try:
        glass.surface_render_method = "BLENDED"
    except Exception:
        pass

    parts = {"eyes": [], "lids": [], "brows": []}
    # Face: an egg with a defined, slightly square jaw.
    # Skull and jaw fused into one seamless surface (voxel remesh), so no seam line shows.
    from mathutils import Matrix
    hb = bmesh.new()
    bmesh.ops.create_uvsphere(hb, u_segments=48, v_segments=24, radius=1, matrix=Matrix.Translation((0, 0, hz + 0.02)) @ Matrix.Diagonal((0.235, 0.225, 0.29, 1)))
    bmesh.ops.create_uvsphere(hb, u_segments=40, v_segments=20, radius=1, matrix=Matrix.Translation((0, -0.025, hz - 0.12)) @ Matrix.Diagonal((0.205, 0.19, 0.16, 1)))
    hme = bpy.data.meshes.new(name + "_skull")
    hb.to_mesh(hme)
    hb.free()
    sk = bpy.data.objects.new(name + "_skull", hme)
    bpy.context.scene.collection.objects.link(sk)
    sk.parent = head
    rmh = sk.modifiers.new("fuse", "REMESH")
    rmh.mode = "VOXEL"
    rmh.voxel_size = 0.008
    smh = sk.modifiers.new("smooth", "SMOOTH")
    smh.factor = 0.9
    smh.iterations = 24
    sk.modifiers.new("sub", "SUBSURF").levels = 1
    sk.data.materials.append(skin)
    for p in sk.data.polygons:
        p.use_smooth = True
    # Stubble beard band along the jaw and chin (a shell just outside the jaw).
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=28, radius=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * 0.212, v.co.y * 0.197 - 0.025, v.co.z * 0.168 + hz - 0.12))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 0.07 or (v.co.z > hz - 0.1 and abs(v.co.x) < 0.17) or v.co.z > hz - 0.04 or (abs(v.co.x) < 0.09 and v.co.z > hz - 0.205)], context="VERTS")
    me = bpy.data.meshes.new(name + "_beard")
    bm.to_mesh(me)
    bm.free()
    bd = bpy.data.objects.new(name + "_beard", me)
    bpy.context.scene.collection.objects.link(bd)
    bd.parent = head
    bd.data.materials.append(stub)
    for p in bd.data.polygons:
        p.use_smooth = True
    # Ears with an inner fold.
    for sx in (1, -1):
        _sphere(f"{name}_ear{sx}", head, (0.228 * sx, 0.02, hz - 0.01), (0.035, 0.03, 0.07), skin, seg=20)
        _sphere(f"{name}_earin{sx}", head, (0.245 * sx, 0.005, hz - 0.01), (0.012, 0.015, 0.04), skin_shadow, seg=12)
    # Long cartoon nose.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
    nose = bpy.context.active_object
    nose.name = name + "_nose"
    nose.location = (0.012, -0.232, hz - 0.03)
    nose.scale = (0.036, 0.042, 0.075)
    nose.rotation_euler = (R(-28), 0, 0)
    nose.parent = head
    nose.data.materials.append(skin)
    for p in nose.data.polygons:
        p.use_smooth = True
    # Eyes: big whites, small pupils, relaxed lids.
    for side, sx in (("L", 1), ("R", -1)):
        ex = 0.085 * sx
        _sphere(f"{name}_eye{side}", head, (ex, -0.2, hz + 0.035), (0.055, 0.03, 0.04), white, seg=24)
        lk = bpy.data.objects.new(f"{name}_look{side}", None)
        bpy.context.scene.collection.objects.link(lk)
        lk.parent = head
        lk.location = (ex, -0.226, hz + 0.03)
        _sphere(f"{name}_pupil{side}", lk, (0, 0, 0), (0.014, 0.008, 0.016), black, seg=16)
        lid = bpy.data.objects.new(f"{name}_lid{side}", None)
        bpy.context.scene.collection.objects.link(lid)
        lid.parent = head
        lid.location = (ex, -0.2, hz + 0.075)
        _sphere(f"{name}_lidmesh{side}", lid, (0, 0, -0.03), (0.06, 0.036, 0.034), skin, seg=24)
        lid.scale = (1, 1, 0.45)  # relaxed, half-lidded like the reference
        bw = bpy.data.objects.new(f"{name}_brow{side}", None)
        bpy.context.scene.collection.objects.link(bw)
        bw.parent = head
        bw.location = (ex, -0.222, hz + 0.115)
        bpy.ops.mesh.primitive_cube_add(size=1)
        bm_ = bpy.context.active_object
        bm_.name = f"{name}_browmesh{side}"
        bm_.scale = (0.1, 0.03, 0.03)
        bm_.rotation_euler = (0, R(-6 * sx), 0)
        bm_.parent = bw
        b = bm_.modifiers.new("b", "BEVEL")
        b.width = 0.012
        b.segments = 3
        bm_.data.materials.append(black)
        parts["eyes"].append(lk)
        parts["lids"].append(lid)
        parts["brows"].append(bw)
    # Glasses: thin translucent grey rounded rectangles, bridge and temples.
    for sx in (1, -1):
        pts = _rounded_rect(0.092 * sx, hz + 0.035, 0.15, 0.1, 0.025, -0.255)
        _tube(f"{name}_frame{sx}", head, pts, 0.0042, frame, closed=True)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0.092 * sx, -0.252, hz + 0.035), rotation=(R(90), 0, 0))
        ln = bpy.context.active_object
        ln.name = f"{name}_lens{sx}"
        ln.scale = (0.145, 0.095, 1)
        ln.parent = head
        ln.data.materials.append(glass)
        _tube(f"{name}_temple{sx}", head, [(0.167 * sx, -0.255, hz + 0.05), (0.225 * sx, -0.12, hz + 0.05), (0.232 * sx, 0.04, hz + 0.0)], 0.005, frame)
    _tube(name + "_bridge", head, [(-0.017, -0.262, hz + 0.05), (0, -0.268, hz + 0.056), (0.017, -0.262, hz + 0.05)], 0.0055, frame)
    # Thick moustache.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
    st = bpy.context.active_object
    st.name = name + "_stache"
    st.location = (0, -0.226, hz - 0.1)
    st.scale = (0.088, 0.034, 0.026)
    st.parent = head
    st.data.materials.append(toon_mat("T_stache_" + name, hair_c, shade=0.6))
    # Mouth: an open smile that scales for speech; dark inside, top teeth, tongue.
    mp = bpy.data.objects.new(name + "_mouth", None)
    bpy.context.scene.collection.objects.link(mp)
    mp.parent = head
    mp.location = (0, -0.212, hz - 0.145)
    # A wide D-shaped smile: half an ellipsoid, flat edge on top.
    bmm = bmesh.new()
    bmesh.ops.create_uvsphere(bmm, u_segments=32, v_segments=16, radius=1)
    bmesh.ops.delete(bmm, geom=[v for v in bmm.verts if v.co.z > 0.05], context="VERTS")
    for v in bmm.verts:
        v.co = Vector((v.co.x * 0.085, v.co.y * 0.03, v.co.z * 0.05 + abs(v.co.x) * 0.012))
    mme = bpy.data.meshes.new(name + "_mouthin")
    bmm.to_mesh(mme)
    bmm.free()
    mo = bpy.data.objects.new(name + "_mouthin", mme)
    bpy.context.scene.collection.objects.link(mo)
    mo.parent = mp
    mo.data.materials.append(mouth_in)
    _sphere(name + "_teeth", mp, (0, -0.016, -0.006), (0.07, 0.014, 0.011), white, seg=16)
    _sphere(name + "_tongue", mp, (0.005, -0.018, -0.034), (0.034, 0.012, 0.012), tongue, seg=16)
    mp.scale = (1, 1, 0.35)
    parts["mouth"] = mp
    hair_mesh(name + "_hair", head, hz, hair, seed=seed)
    return parts
