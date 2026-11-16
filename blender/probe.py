import bpy, time
sc = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0,0,1)); bpy.ops.mesh.primitive_plane_add(size=20)
cam = bpy.data.cameras.new("C"); co = bpy.data.objects.new("C", cam); sc.collection.objects.link(co); co.location=(0,-6,2); co.rotation_euler=(1.4,0,0); sc.camera=co
l = bpy.data.lights.new("k","SUN"); sc.collection.objects.link(bpy.data.objects.new("k", l))
sc.render.engine="BLENDER_EEVEE"; sc.render.resolution_x=1080; sc.render.resolution_y=1920; sc.eevee.taa_render_samples=16
ts=[]
for i in range(3):
    t=time.time(); sc.render.filepath="C:/Users/MSI/Downloads/Claude/logia-reels/blender/probe_%d.png"%i; bpy.ops.render.render(write_still=True); ts.append(round(time.time()-t,2))
print("TIMES", ts)
