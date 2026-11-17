"""Blender (bpy) scene for the Tidemark equity-compensation film.

Each beat is built procedurally and driven by a pure function of time, so any
frame of any beat can be rendered on its own, in any aspect ratio:

    import scene
    scene.render_frame(beat=2, t=6.5, aspect="4x5", path="x.png", scale=0.5, samples=64)

t is local seconds inside the beat. No keyframes, no simulation caches.
"""
import math
import os

import bpy
import bmesh
from mathutils import Vector

import config as C

D = bpy.data


# ----------------------------------------------------------------- helpers
def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    """0 before a, 1 after b, eased between."""
    return ease((t - a) / (b - a)) if b > a else float(t >= a)


def lerp(a, b, f):
    return a + (b - a) * f


def vlerp(a, b, f):
    return Vector(a).lerp(Vector(b), f)


def srgb(hexstr, a=1.0):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (a,)


CREAM = srgb("#F5EFE2")
GOLD = srgb("#E3B55C")
RED = srgb("#E0563A")
NAVY = srgb("#1B365D")
BLUE = srgb("#006298")


def fix_normals(me):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def box(name, size, loc, mat=None, bevel=0.0):
    sx, sy, sz = (s / 2 for s in size)
    v = [(x, y, z) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = D.meshes.new(name)
    me.from_pydata(v, [], f)
    fix_normals(me)
    o = link(D.objects.new(name, me))
    o.location = loc
    if mat:
        me.materials.append(mat)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 3
    return o


def cyl(name, r, h, loc, mat=None, n=48):
    v, f = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        v += [(r * math.cos(a), r * math.sin(a), 0), (r * math.cos(a), r * math.sin(a), h)]
    for i in range(n):
        j = (i + 1) % n
        f.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    f.append(tuple(2 * i for i in range(n))[::-1])
    f.append(tuple(2 * i + 1 for i in range(n)))
    me = D.meshes.new(name)
    me.from_pydata(v, [], f)
    fix_normals(me)
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    o = link(D.objects.new(name, me))
    o.location = loc
    if mat:
        me.materials.append(mat)
    return o


def arc(name, r0, r1, loc, mat, n=64):
    """Flat ring sector in the XZ plane, facing -Y. Fraction set by set_arc()."""
    me = D.meshes.new(name)
    o = link(D.objects.new(name, me))
    o.location = loc
    me.materials.append(mat)
    o["r0"], o["r1"], o["n"] = r0, r1, n
    set_arc(o, 1.0)
    return o


def set_arc(o, frac):
    r0, r1, n = o["r0"], o["r1"], o["n"]
    frac = max(0.002, min(1.0, frac))
    v, f = [], []
    for i in range(n + 1):
        a = math.pi / 2 - 2 * math.pi * frac * i / n      # clockwise from 12 o'clock
        v += [(r0 * math.cos(a), 0, r0 * math.sin(a)), (r1 * math.cos(a), 0, r1 * math.sin(a))]
    for i in range(n):
        f.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    o.data.clear_geometry()
    o.data.from_pydata(v, [], f)


_fonts = {}


def font(name):
    if name not in _fonts:
        _fonts[name] = D.fonts.load(os.path.join(C.FONTS, name))
    return _fonts[name]


def label(body, loc, size=0.1, color=CREAM, align="CENTER", face="Inter-Medium.otf"):
    """Upright text in the XZ plane facing the camera. Fades via obj.color alpha."""
    cu = D.curves.new("label", "FONT")
    cu.body = body
    cu.font = font(face)
    cu.size = size
    cu.align_x = align
    cu.align_y = "BOTTOM_BASELINE"
    cu.space_line = 1.15
    o = link(D.objects.new("label", cu))
    o.location = loc
    o.rotation_euler = (math.radians(90), 0, 0)
    cu.materials.append(M["label"])
    o.color = color
    o.visible_shadow = False
    return o


def line(p0, p1, w=0.006, color=CREAM):
    """Thin blueprint line between two points in the XZ plane at depth y."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    horiz = abs(d.x) >= abs(d.z)
    size = (abs(d.x) + w, w, w) if horiz else (w, w, abs(d.z) + w)
    o = box("line", size, (p0 + p1) / 2, M["label"])
    o.color = color
    o.visible_shadow = False
    return o


def bracket(x0, x1, z, y, color=CREAM, tick=0.035):
    """Dimension line with end ticks."""
    return [line((x0, y, z), (x1, y, z), color=color),
            line((x0, y, z - tick), (x0, y, z + tick), color=color),
            line((x1, y, z - tick), (x1, y, z + tick), color=color)]


def fade(objs, a):
    for o in objs if isinstance(objs, (list, tuple)) else [objs]:
        o.color = (o.color[0], o.color[1], o.color[2], a)
        o.hide_render = a <= 0.001


def tint(o, c0, c1, f):
    o.color = tuple(lerp(c0[i], c1[i], f) for i in range(3)) + (o.color[3],)


# --------------------------------------------------------------- materials
M = {}


def _mat(name):
    m = D.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def _principled(nt, **kw):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    for k, v in kw.items():
        p.inputs[k].default_value = v
    return p


def _shadow_pass(nt, out, shader, tintcol):
    """Let light through glass/water without caustics: transparent to shadow rays."""
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr.inputs[0].default_value = tintcol
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Shadow Ray"], mix.inputs[0])
    nt.links.new(shader.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])


def make_materials():
    M.clear()
    # frosted glass
    m, nt, out = _mat("frosted")
    p = _principled(nt, **{"Base Color": (0.90, 0.95, 1.0, 1), "Roughness": 0.22, "IOR": 1.47,
                           "Transmission Weight": 1.0})
    _shadow_pass(nt, out, p, (0.80, 0.86, 0.92, 1))
    M["frosted"] = m
    m, nt, out = _mat("frosted_heavy")
    p = _principled(nt, **{"Base Color": (0.92, 0.95, 1.0, 1), "Roughness": 0.5, "IOR": 1.47,
                           "Transmission Weight": 1.0})
    _shadow_pass(nt, out, p, (0.80, 0.86, 0.92, 1))
    M["frosted_heavy"] = m
    # clear glass (tank)
    m, nt, out = _mat("clear")
    p = _principled(nt, **{"Base Color": (0.96, 0.98, 1.0, 1), "Roughness": 0.02, "IOR": 1.47,
                           "Transmission Weight": 1.0})
    _shadow_pass(nt, out, p, (0.93, 0.95, 0.97, 1))
    M["clear"] = m
    # water: real refraction (IOR 1.333), rippled surface normal
    m, nt, out = _mat("water")
    p = _principled(nt, **{"Base Color": (0.72, 0.88, 0.95, 1), "Roughness": 0.0, "IOR": 1.333,
                           "Transmission Weight": 1.0})
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.name = "ripple_map"
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.2
    nz.inputs["Detail"].default_value = 2.0
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.22
    bp.inputs["Distance"].default_value = 0.05
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac" if "Fac" in nz.outputs else 0], bp.inputs["Height"])
    nt.links.new(bp.outputs[0], p.inputs["Normal"])
    _shadow_pass(nt, out, p, (0.78, 0.88, 0.93, 1))
    M["water"] = m
    # brushed brass
    m, nt, out = _mat("brass")
    p = _principled(nt, **{"Base Color": (0.78, 0.56, 0.24, 1), "Metallic": 1.0, "Roughness": 0.28,
                           "Anisotropic": 0.7})
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2, 400, 400)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.2
    mr.inputs["To Max"].default_value = 0.4
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    nt.links.new(nz.outputs[0], mr.inputs[0])
    nt.links.new(mr.outputs[0], p.inputs["Roughness"])
    nt.links.new(p.outputs[0], out.inputs[0])
    M["brass"] = m
    # engraving (dark recess on brass)
    m, nt, out = _mat("engrave")
    p = _principled(nt, **{"Base Color": (0.05, 0.035, 0.02, 1), "Metallic": 0.6, "Roughness": 0.6})
    nt.links.new(p.outputs[0], out.inputs[0])
    M["engrave"] = m
    # walnut: fine grain running along X, slow figure from low-frequency noise
    m, nt, out = _mat("walnut")
    p = _principled(nt, **{"Roughness": 0.42})
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.35, 9.0, 1.0)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.1
    nz.inputs["Detail"].default_value = 8
    nz.inputs["Roughness"].default_value = 0.62
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 14
    fine.inputs["Detail"].default_value = 4
    mp2 = nt.nodes.new("ShaderNodeMapping")
    mp2.inputs["Scale"].default_value = (0.5, 40.0, 1.0)
    mx = nt.nodes.new("ShaderNodeMix")
    mx.inputs[0].default_value = 0.35
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.30
    cr.color_ramp.elements[0].color = (0.030, 0.014, 0.007, 1)
    cr.color_ramp.elements[1].position = 0.72
    cr.color_ramp.elements[1].color = (0.150, 0.070, 0.030, 1)
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.05
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(tc.outputs["Object"], mp2.inputs[0])
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    nt.links.new(mp2.outputs[0], fine.inputs["Vector"])
    nt.links.new(nz.outputs[0], mx.inputs[2])
    nt.links.new(fine.outputs[0], mx.inputs[3])
    nt.links.new(mx.outputs[0], cr.inputs[0])
    nt.links.new(cr.outputs[0], p.inputs["Base Color"])
    nt.links.new(fine.outputs[0], bp.inputs["Height"])
    nt.links.new(bp.outputs[0], p.inputs["Normal"])
    nt.links.new(p.outputs[0], out.inputs[0])
    M["walnut"] = m
    # linen paper
    m, nt, out = _mat("linen")
    p = _principled(nt, **{"Base Color": (0.62, 0.56, 0.44, 1), "Roughness": 0.85})
    tc = nt.nodes.new("ShaderNodeTexCoord")
    bumps = []
    for axis in ("X", "Y"):
        w = nt.nodes.new("ShaderNodeTexWave")
        w.bands_direction = axis
        w.inputs["Scale"].default_value = 160
        w.inputs["Distortion"].default_value = 1.5
        nt.links.new(tc.outputs["Object"], w.inputs["Vector"])
        bumps.append(w)
    add = nt.nodes.new("ShaderNodeMath")
    nt.links.new(bumps[0].outputs[1], add.inputs[0])
    nt.links.new(bumps[1].outputs[1], add.inputs[1])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.25
    bp.inputs["Distance"].default_value = 0.002
    nt.links.new(add.outputs[0], bp.inputs["Height"])
    nt.links.new(bp.outputs[0], p.inputs["Normal"])
    nt.links.new(p.outputs[0], out.inputs[0])
    M["linen"] = m
    # wall
    m, nt, out = _mat("wall")
    p = _principled(nt, **{"Base Color": (0.030, 0.062, 0.150, 1), "Roughness": 0.9})
    nt.links.new(p.outputs[0], out.inputs[0])
    M["wall"] = m
    # blocker (gobo)
    m, nt, out = _mat("black")
    p = _principled(nt, **{"Base Color": (0, 0, 0, 1), "Roughness": 1.0})
    nt.links.new(p.outputs[0], out.inputs[0])
    M["black"] = m
    # blueprint ink on paper
    m, nt, out = _mat("ink")
    p = _principled(nt, **{"Base Color": srgb("#1B365D"), "Roughness": 0.8})
    nt.links.new(p.outputs[0], out.inputs[0])
    M["ink"] = m
    # label: emissive, colour and opacity from Object Color
    m, nt, out = _mat("label")
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.6
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(oi.outputs["Color"], em.inputs["Color"])
    nt.links.new(oi.outputs["Alpha"], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    M["label"] = m
    # glow: emissive core, colour from Object Color, strength from its alpha
    m, nt, out = _mat("glow")
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    em = nt.nodes.new("ShaderNodeEmission")
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 14.0
    nt.links.new(oi.outputs["Alpha"], mul.inputs[0])
    nt.links.new(oi.outputs["Color"], em.inputs["Color"])
    nt.links.new(mul.outputs[0], em.inputs["Strength"])
    nt.links.new(em.outputs[0], out.inputs[0])
    M["glow"] = m


# ------------------------------------------------------------- set & light
S = {}


def new_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _fonts.clear()
    make_materials()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    try:                                     # use a GPU when one exists (RunPod)
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for dev in ("OPTIX", "CUDA"):
            prefs.compute_device_type = dev
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == dev]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type == dev
                cy.device = "GPU"
                break
        else:
            prefs.compute_device_type = "NONE"
    except Exception:
        pass
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.use_denoising = True
    cy.max_bounces = 10
    cy.transmission_bounces = 10
    cy.glossy_bounces = 4
    cy.diffuse_bounces = 2
    cy.transparent_max_bounces = 12
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 6.0
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    sc.render.image_settings.file_format = "PNG"

    # world: horizon-to-zenith gradient, driven by set_dusk()
    w = D.worlds.new("sky")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.05
    mr.inputs["From Max"].default_value = 0.55
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.name = "skymix"
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs[0])
    nt.links.new(mr.outputs[0], mix.inputs[0])
    nt.links.new(mix.outputs[2], bg.inputs["Color"])
    nt.links.new(bg.outputs[0], out.inputs[0])
    S["skymix"], S["bg"] = mix, bg

    # camera
    cam = link(D.objects.new("cam", D.cameras.new("cam")))
    cam.data.sensor_fit = "HORIZONTAL"       # same horizontal framing in every aspect
    cam.data.sensor_width = 36
    cam.data.dof.use_dof = True
    sc.camera = cam
    S["cam"] = cam

    # sun through an off-screen window frame (gobo) = golden-hour panes on desk and wall
    sun = link(D.objects.new("sun", D.lights.new("sun", "SUN")))
    sun.data.angle = math.radians(1.2)
    sdir = Vector((0.80, 0.60, -0.25)).normalized()          # direction light travels
    sun.rotation_euler = (-sdir).to_track_quat("Z", "Y").to_euler()
    S["sun"] = sun
    centre = Vector((0.0, 2.0, 1.2)) - sdir * 14
    rot = (-sdir).to_track_quat("Z", "Y")
    def gobo(sz, off):
        o = box("gobo", (sz[0], sz[1], 0.02), centre + rot @ Vector((off[0], off[1], 0)), M["black"])
        o.rotation_euler = rot.to_euler()
        o.visible_camera = False
        o.visible_glossy = False
        o.visible_transmission = False
        o.visible_diffuse = False
    for i in range(-9, 10):                      # window mullions: panes 1.5 x 1.1
        gobo((0.34, 40), (i * 1.5, 0))
    for j in range(-9, 10):
        gobo((40, 0.30), (0, j * 1.1 + 0.2))

    # cool sky key for blue hour + soft front fill
    key = link(D.objects.new("key", D.lights.new("key", "AREA")))
    key.data.size = 5
    key.location = (-3.5, -2.5, 5.5)
    key.rotation_euler = (Vector((0, 0.3, 0.3)) - key.location).to_track_quat("-Z", "Y").to_euler()
    S["key"] = key
    rim = link(D.objects.new("rim", D.lights.new("rim", "AREA")))
    rim.data.size = 3
    rim.location = (3.5, 3.2, 2.6)
    rim.rotation_euler = (Vector((0, 0, 0.4)) - rim.location).to_track_quat("-Z", "Y").to_euler()
    S["rim"] = rim

    # desk and wall
    desk = box("desk", (60, 60, 0.2), (0, 0, -0.1), M["walnut"])
    desk.rotation_euler = (0, 0, math.radians(4))
    box("wall", (80, 0.2, 40), (0, 7.0, 10), M["wall"])
    return sc


def set_dusk(d):
    """0 = golden hour, 1 = blue hour."""
    hz = vlerp((1.0, 0.50, 0.22), (0.10, 0.20, 0.50), d)
    zn = vlerp((0.30, 0.42, 0.75), (0.015, 0.035, 0.13), d)
    S["skymix"].inputs[6].default_value = (*hz, 1)
    S["skymix"].inputs[7].default_value = (*zn, 1)
    S["bg"].inputs["Strength"].default_value = lerp(0.85, 0.30, d)
    S["sun"].data.energy = lerp(13.0, 0.0, ease(d * 1.2))
    S["sun"].data.color = vlerp((1.0, 0.62, 0.34), (1.0, 0.42, 0.22), d)
    S["key"].data.energy = lerp(330, 520, d)
    S["key"].data.color = vlerp((1.0, 0.74, 0.50), (0.50, 0.66, 1.0), d)
    S["rim"].data.energy = lerp(420, 160, d)
    S["rim"].data.color = vlerp((1.0, 0.70, 0.42), (0.55, 0.70, 1.0), d)


PULL = {"4x5": 1.0, "9x16": 1.0, "16x9": 1.0}


def set_camera(loc, target, lens, fstop, aspect, pull=None, focus=None):
    cam = S["cam"]
    loc, target = Vector(loc), Vector(target)
    k = (pull or PULL)[aspect]
    loc = target + (loc - target) * k
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens
    cam.data.dof.focus_distance = (Vector(focus) - loc).length if focus else (target - loc).length
    cam.data.dof.aperture_fstop = fstop


def paper(x0, x1, y0, y1):
    o = box("paper", (x1 - x0, y1 - y0, 0.004), ((x0 + x1) / 2, (y0 + y1) / 2, 0.002), M["linen"])
    return o


def ink_rect(x0, x1, y0, y1, w=0.006):
    z = 0.0045
    for a, b in (((x0, y0), (x1, y0)), ((x0, y1), (x1, y1)), ((x0, y0), (x0, y1)), ((x1, y0), (x1, y1))):
        sx, sy = abs(b[0] - a[0]) + w, abs(b[1] - a[1]) + w
        box("ink", (sx, sy, 0.001), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z), M["ink"])


def ink_ticks(x0, x1, y, n, ln=0.05, w=0.005):
    for i in range(n + 1):
        x = lerp(x0, x1, i / n)
        box("ink", (w, ln * (1.8 if i % 5 == 0 else 1), 0.001), (x, y, 0.0045), M["ink"])


# ================================================================== BEATS
# Block geometry: widths are the exact shares of the example vest.
BW, BD, BH = 1.0, 0.44, 0.52
X0 = -BW / 2
KEPT = 1 - C.BRACKET_RATE                       # 0.63
OWED = C.BRACKET_RATE - C.WITHHOLD_RATE         # 0.15
HELD = C.WITHHOLD_RATE                          # 0.22


def _block_set(solid=False):
    paper(-1.25, 1.6, -0.62, 0.62)
    ink_rect(X0 - 0.06, X0 + BW + 0.06, -BD / 2 - 0.06, BD / 2 + 0.06)
    ink_ticks(X0, X0 + BW, -BD / 2 - 0.16, 20)
    ink_rect(-1.17, 1.52, -0.56, 0.56, w=0.004)
    g = 0.0015                                   # hairline seams between slices
    xs = [X0, X0 + KEPT * BW, X0 + (KEPT + OWED) * BW, X0 + BW]
    parts = []
    if solid:
        box("block", (BW, BD, BH), (0, 0, BH / 2 + 0.004), M["frosted"], bevel=0.008)
    for i, nm in enumerate(() if solid else ("kept", "owed", "held")):
        w = xs[i + 1] - xs[i] - g
        o = box(nm, (w, BD, BH), ((xs[i] + xs[i + 1]) / 2, 0, BH / 2 + 0.004), M["frosted"], bevel=0.008)
        parts.append(o)
    xs = xs if not solid else xs
    core = box("owed_core", ((xs[2] - xs[1]) * 0.55, BD * 0.7, BH * 0.8),
               ((xs[1] + xs[2]) / 2, 0, BH / 2), M["glow"])
    core.color = (RED[0], RED[1], RED[2], 0.0)
    core.visible_shadow = False
    return parts, core, xs


def beat1(aspect):
    """0-3s. Hook. One frosted glass block, walnut, golden hour."""
    parts, core, xs = _block_set(solid=True)
    core.hide_render = True
    pull = {"4x5": 1.0, "9x16": 1.0, "16x9": 1.18}

    def update(t):
        set_dusk(0.0)
        f = t / 3.0
        set_camera(vlerp((1.55, -4.15, 0.92), (1.35, -3.95, 0.90), f), (0.02, 0, 0.60 if aspect != "16x9" else 0.46),
                   85, 1.1, aspect, pull, focus=(0.3, -BD / 2, 0.3))
    return update


def beat2(aspect):
    """3-12s. The withholding gap, to scale."""
    parts, core, xs = _block_set()
    kept, owed, held = parts
    yl = -BD / 2 - 0.01                          # label plane just in front of the block
    top = BH + 0.004
    slide = 0.26
    hx = (xs[2] + xs[3]) / 2
    ox = (xs[1] + xs[2]) / 2
    kx = (xs[0] + xs[1]) / 2
    L = C.LABELS
    g_vest = [label(L["vest"], (0.0, yl, 1.31), 0.092)] + bracket(xs[0], xs[3], 1.21, yl) + \
             [line((-0.40, yl, top + 0.05), (-0.40, yl, 1.21))]
    g_held = [label(L["withheld"], (hx + slide + 0.04, yl, 0.77), 0.092, GOLD)] + \
        bracket(xs[2] + slide, xs[3] + slide, top + 0.07, yl, GOLD) + \
        [line((hx + slide, yl, top + 0.07), (hx + slide, yl, 0.74), color=GOLD)]
    g_owed = [label(L["owed"], (ox - 0.02, yl, 1.02), 0.082, RED)] + \
        bracket(xs[1], xs[2], top + 0.07, yl, RED) + \
        [line((ox, yl, top + 0.07), (ox, yl, 0.845), color=RED)]
    pull = {"4x5": 1.0, "9x16": 1.0, "16x9": 1.95}
    held_x0 = held.location.x

    def update(t):
        set_dusk(lerp(0.05, 0.22, t / 9))
        f = ease(t / 9)
        tz = 0.52 if aspect != "16x9" else 0.47
        set_camera(vlerp((1.1, -4.6, 1.15), (0.5, -4.9, 1.1), f), (0.14, 0, tz), 85, 1.6, aspect, pull,
                   focus=(0.2, -BD / 2, 0.5))
        # vest label + bracket shrinks back to the original span once the slice leaves
        fade(g_vest, ramp(t, 0.2, 0.9))
        s = ramp(t, 1.8, 3.2)
        held.location.x = held_x0 + slide * s
        fade(g_held, ramp(t, 3.0, 3.7))
        glow = ramp(t, 4.4, 5.6)
        core.color = (RED[0], RED[1], RED[2], 0.75 * glow * (0.9 + 0.1 * math.sin(t * 2.2)))
        core.hide_render = glow <= 0
        fade(g_owed, ramp(t, 5.0, 5.8))
    return update


def beat3(aspect):
    """12-22s. Brass calendar rail: lockup gates, ISO lots with two timers, AMT gauge."""
    L = C.LABELS
    paper(-2.2, 2.2, -0.5, 0.75)
    ink_rect(-2.1, 2.1, -0.42, 0.67, w=0.004)
    box("rail", (3.5, 0.16, 0.06), (0, 0, 0.034), M["brass"], bevel=0.006)
    for i in range(37):                           # engraved week/month ticks
        x = -1.68 + i * (3.36 / 36)
        major = i % 6 == 0
        box("tick", (0.008, 0.07 if major else 0.04, 0.002), (x, -0.045 + (0.015 if major else 0), 0.0645), M["engrave"])
    yg, yl = 0.16, -0.10
    GH = 1.22
    gates = []
    for gx in (-0.78, 0.62):
        posts = [box("gp", (0.05, 0.05, GH), (gx + s * 0.22, yg, GH / 2), M["brass"], bevel=0.004) for s in (-1, 1)]
        lintel = box("gl", (0.54, 0.06, 0.05), (gx, yg, GH + 0.025), M["brass"], bevel=0.004)
        pane = box("gpane", (0.39, 0.012, GH - 0.1), (gx, yg, GH / 2), M["frosted"])
        lab = [label(L["gate"], (gx, yl, GH + 0.31), 0.125), label(L["gate_sub"], (gx, yl, GH + 0.165), 0.10, GOLD),
               line((gx, yl, GH + 0.07), (gx, yl, GH + 0.13))]
        gates.append((posts + [lintel], pane, lab))
    lots = []
    for i, lx in enumerate((-1.36, -0.12)):
        cube = box("lot", (0.27, 0.27, 0.27), (lx, 0, 0.065 + 0.137), M["frosted"], bevel=0.008)
        core = box("lotcore", (0.13, 0.13, 0.13), (lx, 0, 0.065 + 0.137), M["glow"])
        core.color = (GOLD[0], GOLD[1], GOLD[2], 0)
        core.visible_shadow = False
        dials = []
        for s in (-1, 1):
            dx, dz = lx + s * 0.135, 0.68
            ring = arc("ring", 0.100, 0.113, (dx, yl + 0.02, dz), M["brass"])
            fill = arc("fill", 0.050, 0.090, (dx, yl + 0.015, dz), M["label"])
            fill.color = GOLD
            fill.visible_shadow = False
            stem = box("stem", (0.012, 0.012, 0.23), (dx, yl + 0.03, 0.455), M["brass"])
            dials.append((ring, fill, stem))
        lots.append((cube, core, dials, lx))
    hero = lots[1][3]
    d0, d1 = hero - 0.135, hero + 0.135
    tl = [label(L["timer_ex"], (d0 + 0.05, yl, 2.14), 0.118, align="LEFT"),
          line((d0, yl, 0.82), (d0, yl, 2.24)),
          label(L["timer_gr"], (d1 + 0.05, yl, 1.93), 0.118, align="LEFT"),
          line((d1, yl, 0.82), (d1, yl, 2.03))]
    lot_lab = [label(L["lot"], (lots[0][3], yl, 0.90), 0.118)]
    # AMT gauge
    ax, AH = 1.36, 1.45
    box("abase", (0.26, 0.26, 0.05), (ax, yg, 0.025), M["brass"], bevel=0.005)
    cyl("atube", 0.075, AH, (ax, yg, 0.05), M["clear"])
    cyl("acap", 0.085, 0.03, (ax, yg, AH + 0.05), M["brass"])
    level = cyl("alevel", 0.055, AH, (ax, yg, 0.055), M["glow"])
    level.color = (GOLD[0] * 1.0, GOLD[1] * 0.75, GOLD[2] * 0.4, 0.07)
    level.visible_shadow = False
    for i in range(11):
        box("atick", (0.07 if i % 5 == 0 else 0.04, 0.006, 0.006),
            (ax - 0.13 - (0.035 if i % 5 == 0 else 0.02), yg, 0.06 + i * AH * 0.097), M["brass"])
    amt_lab = [label(L["amt"], (ax, yl, AH + 0.20), 0.125)]
    pull = {"4x5": 1.0, "9x16": 1.0, "16x9": 1.58}
    ex_times = (5.4, 7.0)                         # when each lot is exercised

    def update(t):
        set_dusk(lerp(0.35, 0.55, t / 10))
        f = ease(t / 4.5)
        tz = lerp(0.62, 1.02, f) if aspect != "16x9" else lerp(0.6, 0.90, f)
        set_camera(vlerp((-0.9, -3.6, 0.8), (0.75, -8.3, 1.75), f) + Vector((0.22 * t / 10, 0, 0)),
                   vlerp((-0.75, 0, 0.5), (0.02, 0, tz), f), 85, lerp(1.2, 2.0, f), aspect, pull,
                   focus=(0, yl, 0.6))
        for i, (frame, pane, lab) in enumerate(gates):
            a = ramp(t, 1.4 + i * 0.7, 2.2 + i * 0.7)
            for o in frame + [pane]:
                o.hide_render = a <= 0
                o.scale = (1, 1, max(a, 0.001))
            for o in frame[:2]:
                o.location.z = GH / 2 * a
            frame[2].location.z = (GH + 0.025) * a
            # the pane lifts clear when the lockup releases
            rel = ramp(t, 6.0 + i * 1.6, 7.0 + i * 1.6)
            pane.scale = (1, 1, max(a * (1 - 0.92 * rel), 0.001))
            pane.location.z = lerp(GH / 2 * a, GH - 0.05, rel)
            fade(lab, ramp(t, 2.0 + i * 0.7, 2.7 + i * 0.7))
        n_ex = 0.0
        for i, (cube, core, dials, lx) in enumerate(lots):
            a = ramp(t, 2.8 + i * 0.5, 3.4 + i * 0.5)
            cube.hide_render = a <= 0
            cube.scale = (a, a, a) if a > 0 else (0.001,) * 3
            ex = ramp(t, ex_times[i], ex_times[i] + 0.8)
            n_ex += ex
            core.hide_render = ex <= 0
            core.color = (GOLD[0], GOLD[1] * 0.8, GOLD[2] * 0.5, 0.16 * ex)
            # grant clock is already running; exercise clock starts at exercise
            grant = min(1.0, (0.30 + 0.14 * i) + 0.035 * max(0, t - 3))
            exer = min(1.0, 0.09 * max(0, t - ex_times[i]))
            for (ring, fill, stem), fr in zip(dials, (exer, grant)):
                for o in (ring, fill, stem):
                    o.hide_render = a <= 0
                set_arc(fill, fr)
                fill.hide_render = a <= 0 or fr <= 0.004
        fade(tl, ramp(t, 3.8, 4.6))
        fade(lot_lab, ramp(t, 3.2, 3.9))
        fade(amt_lab, ramp(t, 4.4, 5.0))
        level.scale = (1, 1, 0.06 + 0.36 * n_ex)
    return update


def beat4(aspect):
    """22-32s. The rail becomes a sequence; the tide rises past each mark; one tower becomes a skyline."""
    L = C.LABELS
    xs = [-1.24, -0.62, 0.0, 0.62, 1.24]
    marks = [0.24, 0.39, 0.54, 0.69, 0.84]
    start = [0.62, -1.24, 1.24, 0.0, -0.62]       # shuffled start positions
    th, T = 1.02, 0.012
    for sy in (-1, 1):
        box("tank", (3.3, T, th), (0, sy * 0.25, th / 2), M["clear"])
    for sx in (-1, 1):
        box("tank", (T, 0.5, th), (sx * 1.65, 0, th / 2), M["clear"])
    box("rail4", (3.2, 0.14, 0.04), (0, 0, 0.022), M["brass"], bevel=0.005)
    water = box("water", (3.28, 0.486, 1.0), (0, 0, 0.5), M["water"])
    posts = []
    yl = -0.27
    for i, (x, mz) in enumerate(zip(xs, marks)):
        h = mz + 0.06
        p = box("post", (0.10, 0.10, h), (x, 0, h / 2 + 0.042), M["brass"], bevel=0.005)
        e = box("eng", (0.104, 0.104, 0.008), (x, 0, mz + 0.042 - 0.03), M["engrave"])
        row = -1.02 if i % 2 == 0 else -0.66
        al = {0: "LEFT", 4: "RIGHT"}.get(i, "CENTER")
        lx = x + {0: -0.10, 4: 0.10}.get(i, 0)
        lab = label("{}  {}".format(i + 1, L["steps"][i]), (lx, row, 0.03), 0.125, align=al)
        ll = 0.22 if i % 2 == 0 else 0.001
        ld = box("lead", (0.006, ll, 0.002), (x, -0.29 - ll / 2, 0.002), M["label"])
        ld.color = CREAM
        ld.visible_shadow = False
        posts.append((p, e, lab, ld, h))
    # skyline, seen above and through the tank
    ys = 1.9
    tx = [0.0, -1.32, -0.88, -0.44, 0.44, 0.88, 1.32]
    hs = [2.30, 1.95, 2.25, 2.05, 2.20, 1.90, 2.15]
    towers = []
    for i, x in enumerate(tx):
        tw = box("tower", (0.32, 0.32, 1.0), (x, ys, 0.5), M["frosted_heavy"], bevel=0.006)
        gl = box("tcore", (0.14, 0.14, 1.0), (x, ys, 0.5), M["glow"])
        gl.visible_shadow = False
        towers.append((tw, gl))
    pull = {"4x5": 1.0, "9x16": 1.0, "16x9": 1.95}

    def update(t):
        set_dusk(lerp(0.72, 1.0, t / 10))
        f = ease(t / 10)
        tz = 0.78 if aspect != "16x9" else 0.62
        set_camera(vlerp((-0.55, -8.3, 3.0), (0.4, -7.9, 2.8), f), (0.0, 0.3, tz), 85, 2.2, aspect, pull,
                   focus=(0, yl, 0.6))
        r = ramp(t, 0.3, 2.2)                     # posts slide along the rail into sequence
        level = lerp(0.07, 0.93, ramp(t, 2.4, 8.0))
        water.scale = (1, 1, level)
        water.location.z = 0.012 + level / 2
        for i, (p, e, lab, ld, h) in enumerate(posts):
            x = lerp(start[i], xs[i], r)
            p.location.x = x
            e.location.x = x
            fade([lab, ld], ramp(t, 1.6 + 0.15 * i, 2.3 + 0.15 * i))
            passed = ramp(level, marks[i] + 0.012 - 0.03, marks[i] + 0.012 + 0.03)
            tint(lab, CREAM, GOLD, passed)
            tint(ld, CREAM, GOLD, passed)
        s = ramp(t, 4.6, 8.6)                     # one tall tower -> balanced skyline
        lit = ramp(t, 5.4, 9.0)
        for i, (tw, gl) in enumerate(towers):
            h = lerp(3.55, hs[0], s) if i == 0 else hs[i] * ramp(s, 0.08 * i, 0.4 + 0.1 * i)
            vis = h > 0.01
            tw.hide_render = gl.hide_render = not vis
            if vis:
                tw.scale = (1, 1, h)
                tw.location.z = h / 2
                gl.scale = (1, 1, h * 0.92)
                gl.location.z = h / 2
                gl.color = (1.0, 0.62, 0.28, 0.02 + 0.10 * lit)
    return update


def beat5(aspect):
    """32-40s. Cream linen end card; type and logo are composited in 2D for exact brand colour."""
    p = box("card", (12, 12, 0.02), (0, 0, 0), M["linen"])
    for o in list(D.objects):
        if o.name.startswith(("desk", "wall", "gobo")):
            o.hide_render = True

    def update(t):
        set_dusk(0.0)
        S["sun"].data.energy = 0.0
        S["key"].data.energy = 900
        S["key"].data.color = (1.0, 0.95, 0.88)
        S["rim"].data.energy = 0
        S["bg"].inputs["Strength"].default_value = 0.9
        set_camera((0, -0.01, lerp(4.2, 4.0, t / 8)), (0, 0, 0), 60, 16, aspect)
    return update


BUILD = {1: beat1, 2: beat2, 3: beat3, 4: beat4, 5: beat5}
_state = {}


def prepare(beat, aspect):
    """Build (or reuse) the scene for a beat/aspect; returns update(t)."""
    key = (beat, aspect)
    if _state.get("key") != key:
        new_scene()
        _state["update"] = BUILD[beat](aspect)
        _state["key"] = key
    return _state["update"]


def render_frame(beat, t, aspect, path, scale=1.0, samples=96):
    update = prepare(beat, aspect)
    sc = bpy.context.scene
    w, h = C.ASPECTS[aspect]
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = int(scale * 100)
    sc.cycles.samples = samples
    update(t)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path
