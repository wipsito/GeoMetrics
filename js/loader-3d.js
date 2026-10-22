/* ══════════════════════════════════════════════════════════════════════
   GeoMetrics · Pantalla de carga 3D — motor WebGL propio (sin librerías)
   Renderiza la retroexcavadora en 3D real a devicePixelRatio (nitidez).
   API pública: window.GML3D
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
    'use strict';

    var GML3D = { ok: false };
    global.GML3D = GML3D;

    /* ─────────────────────────── matrices 4x4 ─────────────────────────── */
    function m4() { return new Float32Array(16); }
    function mId(o) {
        o[0]=1;o[1]=0;o[2]=0;o[3]=0; o[4]=0;o[5]=1;o[6]=0;o[7]=0;
        o[8]=0;o[9]=0;o[10]=1;o[11]=0; o[12]=0;o[13]=0;o[14]=0;o[15]=1; return o;
    }
    function mMul(a, b, o) {
        var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],
            a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
        var b0=b[0],b1=b[1],b2=b[2],b3=b[3];
        o[0]=b0*a00+b1*a10+b2*a20+b3*a30; o[1]=b0*a01+b1*a11+b2*a21+b3*a31;
        o[2]=b0*a02+b1*a12+b2*a22+b3*a32; o[3]=b0*a03+b1*a13+b2*a23+b3*a33;
        b0=b[4];b1=b[5];b2=b[6];b3=b[7];
        o[4]=b0*a00+b1*a10+b2*a20+b3*a30; o[5]=b0*a01+b1*a11+b2*a21+b3*a31;
        o[6]=b0*a02+b1*a12+b2*a22+b3*a32; o[7]=b0*a03+b1*a13+b2*a23+b3*a33;
        b0=b[8];b1=b[9];b2=b[10];b3=b[11];
        o[8]=b0*a00+b1*a10+b2*a20+b3*a30; o[9]=b0*a01+b1*a11+b2*a21+b3*a31;
        o[10]=b0*a02+b1*a12+b2*a22+b3*a32; o[11]=b0*a03+b1*a13+b2*a23+b3*a33;
        b0=b[12];b1=b[13];b2=b[14];b3=b[15];
        o[12]=b0*a00+b1*a10+b2*a20+b3*a30; o[13]=b0*a01+b1*a11+b2*a21+b3*a31;
        o[14]=b0*a02+b1*a12+b2*a22+b3*a32; o[15]=b0*a03+b1*a13+b2*a23+b3*a33;
        return o;
    }
    function mPersp(o, fovy, aspect, near, far) {
        var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
        o[0]=f/aspect;o[1]=0;o[2]=0;o[3]=0; o[4]=0;o[5]=f;o[6]=0;o[7]=0;
        o[8]=0;o[9]=0;o[10]=(far+near)*nf;o[11]=-1; o[12]=0;o[13]=0;o[14]=2*far*near*nf;o[15]=0;
        return o;
    }
    function mLookAt(o, e, c, up) {
        var zx=e[0]-c[0], zy=e[1]-c[1], zz=e[2]-c[2], l=1/Math.hypot(zx,zy,zz); zx*=l; zy*=l; zz*=l;
        var xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
        l=1/Math.hypot(xx,xy,xz); xx*=l; xy*=l; xz*=l;
        var yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
        o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0; o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;
        o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
        o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]); o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]); o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]); o[15]=1;
        return o;
    }
    /* T * Ry * Rx * Rz * S  (rotaciones en radianes) */
    function mTRS(o, t, r, s) {
        var cx=Math.cos(r[0]), sx=Math.sin(r[0]), cy=Math.cos(r[1]), sy=Math.sin(r[1]),
            cz=Math.cos(r[2]), sz=Math.sin(r[2]);
        o[0]=(cy*cz+sy*sx*sz)*s[0]; o[1]=(-cy*sz+sy*sx*cz)*s[0]; o[2]=(sy*cx)*s[0]; o[3]=0;
        o[4]=(cx*sz)*s[1]; o[5]=(cx*cz)*s[1]; o[6]=(-sx)*s[1]; o[7]=0;
        o[8]=(-sy*cz+cy*sx*sz)*s[2]; o[9]=(sy*sz+cy*sx*cz)*s[2]; o[10]=(cy*cx)*s[2]; o[11]=0;
        o[12]=t[0]; o[13]=t[1]; o[14]=t[2]; o[15]=1;
        return o;
    }

    /* ─────────────────────────── geometría ─────────────────────────── */
    function Geo() { this.p = []; this.n = []; this.t = []; this.a = []; this.i = []; }
    Geo.prototype.v = function (x, y, z, nx, ny, nz, u, v, al) {
        this.p.push(x, y, z); this.n.push(nx, ny, nz); this.t.push(u, v);
        this.a.push(al === undefined ? 1 : al);
        return this.p.length / 3 - 1;
    };
    Geo.prototype.q = function (a, b, c, d) { this.i.push(a, b, c, a, c, d); };
    /* cara con normal calculada (a,b,c en CCW) */
    Geo.prototype.face = function (a, b, c, d) {
        var ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
        var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, l=1/Math.hypot(nx,ny,nz);
        nx*=l; ny*=l; nz*=l;
        var i0=this.v(a[0],a[1],a[2],nx,ny,nz,0,0,1), i1=this.v(b[0],b[1],b[2],nx,ny,nz,1,0,1),
            i2=this.v(c[0],c[1],c[2],nx,ny,nz,1,1,1), i3=this.v(d[0],d[1],d[2],nx,ny,nz,0,1,1);
        this.q(i0,i1,i2,i3);
    };

    function gBox(w, h, d) {
        var g = new Geo(), x=w/2, y=h/2, z=d/2;
        g.face([-x,-y, z],[ x,-y, z],[ x, y, z],[-x, y, z]);
        g.face([ x,-y,-z],[-x,-y,-z],[-x, y,-z],[ x, y,-z]);
        g.face([ x,-y, z],[ x,-y,-z],[ x, y,-z],[ x, y, z]);
        g.face([-x,-y,-z],[-x,-y, z],[-x, y, z],[-x, y,-z]);
        g.face([-x, y, z],[ x, y, z],[ x, y,-z],[-x, y,-z]);
        g.face([-x,-y,-z],[ x,-y,-z],[ x, y, z],[-x, y, z]);
        return g;
    }
    function gCyl(rb, rt, h, seg) {
        var g = new Geo(), i, a, nx, ny, nz, l, b;
        var slope = (rb - rt) / h;
        for (i=0;i<=seg;i++) {
            a = i/seg*Math.PI*2; nx=Math.cos(a); nz=Math.sin(a);
            ny = slope; l = 1/Math.hypot(nx,ny,nz); nx*=l; ny*=l; nz*=l;
            b = g.p.length/3;
            g.v(nx*rb, -h/2, nz*rb, nx,ny,nz, i/seg, 0, 1);
            g.v(nx*rt,  h/2, nz*rt, nx,ny,nz, i/seg, 1, 1);
            if (i < seg) g.q(b, b+1, b+3, b+2);
        }
        /* tapas */
        b = g.p.length/3;
        for (i=0;i<=seg;i++) { a=i/seg*Math.PI*2; g.v(Math.cos(a)*rt, h/2, Math.sin(a)*rt, 0,1,0, .5+Math.cos(a)*.5, .5+Math.sin(a)*.5, 1); }
        for (i=0;i<seg;i++) g.q(b, b+i+1, b+i+2);
        b = g.p.length/3;
        for (i=0;i<=seg;i++) { a=i/seg*Math.PI*2; g.v(Math.cos(a)*rb, -h/2, Math.sin(a)*rb, 0,-1,0, .5+Math.cos(a)*.5, .5+Math.sin(a)*.5, 1); }
        for (i=0;i<seg;i++) g.q(b, b+i+2, b+i+1);
        return g;
    }
    function gSphere(r, seg, rings) {
        var g = new Geo(), x, y, i, j, a, b0;
        for (y=0;y<=rings;y++) {
            b0 = y/rings*Math.PI, a = Math.sin(b0), b0 = Math.cos(b0);
            for (x=0;x<=seg;x++) {
                var t = x/seg*Math.PI*2, nx=Math.cos(t)*a, ny=b0, nz=Math.sin(t)*a;
                g.v(nx*r, ny*r, nz*r, nx,ny,nz, x/seg, y/rings, 1);
            }
        }
        for (y=0;y<rings;y++) for (x=0;x<seg;x++) {
            var i0 = y*(seg+1)+x, i1 = i0+seg+1;
            g.q(i0, i1, i1+1, i0+1);
        }
        return g;
    }
    function gTorus(R, r, seg, rseg) {
        var g = new Geo(), i, j;
        for (i=0;i<=seg;i++) {
            var u=i/seg*Math.PI*2, ca=Math.cos(u), sa=Math.sin(u);
            for (j=0;j<=rseg;j++) {
                var v=j/rseg*Math.PI*2, cb=Math.cos(v), sb=Math.sin(v);
                g.v((R+r*cb)*ca, r*sb, (R+r*cb)*sa, ca*cb, sb, sa*cb, i/seg, j/rseg, 1);
            }
        }
        for (i=0;i<seg;i++) for (j=0;j<rseg;j++) {
            var i0=i*(rseg+1)+j, i1=i0+rseg+1;
            g.q(i0, i1, i1+1, i0+1);
        }
        return g;
    }
    /* disco plano en XZ (sombra) con UV centrada */
    function gDisc(r, seg) {
        var g = new Geo(), i;
        g.v(0,0,0, 0,1,0, .5,.5, 1);
        for (i=0;i<=seg;i++) {
            var a=i/seg*Math.PI*2;
            g.v(Math.cos(a)*r, 0, Math.sin(a)*r, 0,1,0, .5+Math.cos(a)*.5, .5+Math.sin(a)*.5, 1);
        }
        for (i=0;i<seg;i++) g.q(0, i+1, i+2);
        return g;
    }
    /* caja cónica a lo largo de +X (0..len) */
    function gTaper(len, w0, h0, w1, h1) {
        var g = new Geo();
        var c0=[0,-h0/2,-w0/2], c1=[0,-h0/2,w0/2], c2=[0,h0/2,w0/2], c3=[0,h0/2,-w0/2];
        var d0=[len,-h1/2,-w1/2], d1=[len,-h1/2,w1/2], d2=[len,h1/2,w1/2], d3=[len,h1/2,-w1/2];
        g.face(c0,d0,d3,c3); g.face(c1,c2,d2,d1); g.face(c3,d3,d2,c2);
        g.face(c0,c1,d1,d0); g.face(d0,d1,d2,d3); g.face(c1,c0,c3,c2);
        return g;
    }
    /* prisma: perfil 2D en XY extruido en Z (perfil convexo) */
    function gPrism(prof, depth) {
        var g = new Geo(), i, n = prof.length, z0=-depth/2, z1=depth/2, cx=0, cy=0;
        for (i=0;i<n;i++) { cx+=prof[i][0]; cy+=prof[i][1]; }
        cx/=n; cy/=n;
        for (i=0;i<n;i++) {
            var p=prof[i], q=prof[(i+1)%n];
            var ex=q[0]-p[0], ey=q[1]-p[1], l=1/Math.hypot(ex,ey), nx=ey*l, ny=-ex*l;
            var b=g.p.length/3;
            g.v(p[0],p[1],z0, nx,ny,0, 0,0, 1); g.v(q[0],q[1],z0, nx,ny,0, 1,0, 1);
            g.v(q[0],q[1],z1, nx,ny,0, 1,1, 1); g.v(p[0],p[1],z1, nx,ny,0, 0,1, 1);
            g.q(b,b+1,b+2,b+3);
        }
        for (i=0;i<n;i++) {
            var p2=prof[i], q2=prof[(i+1)%n];
            g.face([p2[0],p2[1],z0],[q2[0],q2[1],z0],[cx,cy,z0],[cx,cy,z0]);
            g.face([q2[0],q2[1],z1],[p2[0],p2[1],z1],[cx,cy,z1],[cx,cy,z1]);
        }
        return g;
    }
    /* rejilla del suelo: líneas en X y Z con alfa por vértice */
    function gGrid(step, x0, x1, z0, z1) {
        var g = new Geo(), i, x, z, a, b;
        function fade(zz) {
            var f = (zz - z0) / 6; if (f < 0) f = 0; if (f > 1) f = 1;
            var g2 = 1 - Math.max(0, Math.min(1, (zz - 2) / 7));
            return f * g2 * 0.85;
        }
        for (x=x0; x<=x1+0.001; x+=step) {
            b = g.p.length/3;
            g.v(x,0,z0, 0,1,0, 0,0, fade(z0)); g.v(x,0,z1, 0,1,0, 0,1, fade(z1));
            g.q(b,b+1,b+2,b+1);
        }
        for (z=z0; z<=z1+0.001; z+=step) {
            b = g.p.length/3;
            g.v(x0,0,z, 0,1,0, 0,0, fade(z)); g.v(x1,0,z, 0,1,0, 1,0, fade(z));
            g.q(b,b+1,b+2,b+1);
        }
        return g;
    }
    /* plano del suelo */
    function gPlane(x0, x1, z0, z1) {
        var g = new Geo();
        g.face([x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0]);
        return g;
    }

    /* ─────────────────────────── nodos de escena ─────────────────────────── */
    function Node(mesh, col, opt) {
        this.mesh = mesh; this.col = col;
        this.t = [0,0,0]; this.r = [0,0,0]; this.s = [1,1,1];
        this.alpha = 1; this.spec = .22; this.shin = 30; this.emis = 0; this.soft = 0;
        this.kids = []; this.vis = true; this.tr = false;   /* tr = transparente */
        if (opt) for (var k in opt) this[k] = opt[k];
    }
    function add(parent, node) { parent.kids.push(node); return node; }

    /* ─────────────────────────── contexto WebGL ─────────────────────────── */
    var gl = null, cv = null, dpr = 1, cw = 1, ch = 1, W = 1, H = 1;
    var prog = null, ppts = null, U = {}, UP = {};
    var VIEW = m4(), PROJ = m4(), VP = m4();
    var MST = [], mDepth = 0;
    for (var _i = 0; _i < 32; _i++) MST.push(m4());
    mId(MST[0]);

    var VS = [
        'attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUV; attribute float aA;',
        'uniform mat4 uVP; uniform mat4 uM; uniform mat3 uNM;',
        'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying float vA;',
        'void main(){ vec4 wp = uM * vec4(aPos,1.0); vW = wp.xyz; vN = uNM * aNor;',
        ' vUV = aUV; vA = aA; gl_Position = uVP * wp; }'
    ].join('\n');
    var FS = [
        'precision mediump float;',
        'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying float vA;',
        'uniform vec3 uCol; uniform float uAlpha; uniform float uSpec; uniform float uShin;',
        'uniform float uEmis; uniform float uSoft;',
        'uniform vec3 uLdir; uniform vec3 uLcol; uniform vec3 uAmbT; uniform vec3 uAmbB;',
        'uniform vec3 uRim; uniform vec3 uCam;',
        'void main(){',
        '  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;',
        '  vec3 V = normalize(uCam - vW);',
        '  float ndl = max(dot(N, uLdir), 0.0);',
        '  vec3 H = normalize(uLdir + V);',
        '  float sp = pow(max(dot(N,H),0.0), uShin) * uSpec;',
        '  float hemi = 0.5 + 0.5*N.y;',
        '  vec3 c = uCol * (mix(uAmbB, uAmbT, hemi) + uLcol*ndl) + uLcol*sp',
        '        + uRim * pow(1.0 - max(dot(N,V),0.0), 4.0) * 0.22 + uCol * uEmis;',,
        '  float a = uAlpha * vA;',
        '  if(uSoft > 0.5){ float d = length(vUV - vec2(0.5)); a *= 1.0 - smoothstep(0.10, 0.5, d); }',
        '  if(a < 0.004) discard;',
        '  gl_FragColor = vec4(c, a);',
        '}'
    ].join('\n');
    var PVS = [
        'attribute vec3 aPos; attribute float aSize; attribute float aA; attribute vec3 aCol;',
        'uniform mat4 uVP; uniform float uPS;',
        'varying float vA; varying vec3 vC;',
        'void main(){ vec4 p = uVP * vec4(aPos,1.0); vA = aA; vC = aCol;',
        ' gl_Position = p; gl_PointSize = max(1.0, aSize * uPS / max(p.w, 0.001)); }'
    ].join('\n');
    var PFS = [
        'precision mediump float; varying float vA; varying vec3 vC;',
        'void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d);',
        ' float a = smoothstep(0.5, 0.12, r) * vA; if(a < 0.006) discard;',
        ' gl_FragColor = vec4(vC, a); }'
    ].join('\n');

    function sh(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
        return s;
    }
    function prog2(vs, fs) {
        var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
        if (!v || !f) return null;
        var p = gl.createProgram();
        gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
        return p;
    }
    function unis(p, names, into) {
        for (var i = 0; i < names.length; i++) into[names[i]] = gl.getUniformLocation(p, names[i]);
    }

    /* ─────────────────────────── subida de mallas ─────────────────────────── */
    function upload(g) {
        var n = g.p.length / 3, d = new Float32Array(n * 9), i;
        for (i = 0; i < n; i++) {
            d[i*9+0]=g.p[i*3]; d[i*9+1]=g.p[i*3+1]; d[i*9+2]=g.p[i*3+2];
            d[i*9+3]=g.n[i*3]; d[i*9+4]=g.n[i*3+1]; d[i*9+5]=g.n[i*3+2];
            d[i*9+6]=g.t[i*2]; d[i*9+7]=g.t[i*2+1]; d[i*9+8]=g.a[i];
        }
        var vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
        var ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.i), gl.STATIC_DRAW);
        return { vb: vb, ib: ib, n: g.i.length };
    }
    function bindMesh(m) {
        gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
        var st = 9 * 4;
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 24);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, st, 32);
    }

    /* ─────────────────────────── paleta ─────────────────────────── */
    var C = {
        Y:   [0.95, 0.73, 0.10], Yd:  [0.80, 0.58, 0.05], Yl: [0.99, 0.84, 0.36],
        BL:  [0.15, 0.36, 0.60], BLd: [0.09, 0.24, 0.43], GL: [0.60, 0.83, 0.95],
        DK:  [0.10, 0.11, 0.13], TK:  [0.06, 0.07, 0.08], ST: [0.42, 0.46, 0.50],
        GY:  [0.25, 0.28, 0.32], OR:  [0.96, 0.45, 0.09], OY:  [0.98, 0.78, 0.16],
        SK:  [0.95, 0.78, 0.61], NV:  [0.11, 0.21, 0.52], BL2: [0.16, 0.40, 0.92],
        CN:  [0.45, 0.82, 0.99], GRD: [0.30, 0.36, 0.44]
    };

    /* ─────────────────────────── modelo 3D ─────────────────────────── */
    var M = null;   /* referencias animadas */

    function buildScene() {
        var mm = {
            chassis: upload(gBox(4.30, 0.50, 1.10)),
            hood:    upload(gBox(1.30, 0.62, 1.00)),
            grille:  upload(gBox(0.06, 0.44, 0.86)),
            tower:   upload(gBox(0.50, 0.95, 0.85)),
            cabLow:  upload(gBox(1.25, 0.66, 1.10)),
            pillar:  upload(gBox(0.10, 0.42, 0.10)),
            glass:   upload(gBox(1.20, 0.40, 1.05)),
            roof:    upload(gBox(1.45, 0.15, 1.25)),
            lamp:    upload(gBox(0.12, 0.10, 0.07)),
            beacon:  upload(gCyl(0.075, 0.075, 0.14, 12)),
            pipe:    upload(gCyl(0.05, 0.05, 1.15, 10)),
            pipeCap: upload(gBox(0.13, 0.07, 0.13)),
            wheelR:  upload(gCyl(0.60, 0.60, 0.30, 30)),
            hubR:    upload(gCyl(0.33, 0.33, 0.34, 20)),
            wheelF:  upload(gCyl(0.40, 0.40, 0.26, 26)),
            hubF:    upload(gCyl(0.22, 0.22, 0.30, 18)),
            beam:    upload(gTaper(1.90, 0.34, 0.30, 0.26, 0.22)),
            boom:    upload(gTaper(1.45, 0.34, 0.36, 0.24, 0.24)),
            stick:   upload(gTaper(1.60, 0.26, 0.26, 0.20, 0.20)),
            piston:  upload(gCyl(0.09, 0.09, 0.75, 10)),
            rod:     upload(gCyl(0.05, 0.05, 0.55, 8)),
            bucket:  upload(gPrism([[-0.55,0.42],[0.30,0.60],[0.66,0.18],[0.52,-0.40],[-0.10,-0.50],[-0.52,-0.12]], 1.16)),
            bucketG: upload(gPrism([[0.55,0.40],[-0.25,0.58],[-0.60,0.15],[-0.45,-0.38],[0.12,-0.48],[0.52,-0.10]], 0.92)),
            tooth:   upload(gBox(0.17, 0.09, 0.10)),
            torso:   upload(gBox(0.34, 0.46, 0.22)),
            stripe:  upload(gBox(0.36, 0.07, 0.24)),
            head:    upload(gSphere(0.105, 14, 10)),
            helmet:  upload(gSphere(0.125, 14, 8)),
            brim:    upload(gCyl(0.155, 0.155, 0.03, 14)),
            leg:     upload(gBox(0.13, 0.42, 0.14)),
            boot:    upload(gBox(0.15, 0.09, 0.22)),
            arm:     upload(gBox(0.10, 0.36, 0.10)),
            steer:   upload(gTorus(0.13, 0.028, 16, 8)),
            seat:    upload(gBox(0.30, 0.08, 0.30)),
            disc:    upload(gDisc(1, 30)),
            plane:   upload(gPlane(-70, 70, -46, 26)),
            grid:    upload(gGrid(1.2, -56, 56, -36, 20))
        };

        /* ░░ chasis / capó ░░ */
        var root = new Node(null, C.Y);
        var body = add(root, new Node(mm.chassis, C.Y, { t: [-0.10, 0.92, 0] }));
        add(body, new Node(mm.hood, C.Y, { t: [-1.55, 1.48, 0] }));
        for (var i = 0; i < 3; i++) {
            add(body, new Node(mm.grille, C.Yd, { t: [-2.19, 1.30 + i * 0.16, 0] }));
        }
        add(body, new Node(mm.tower, C.Y, { t: [1.28, 1.42, 0] }));

        /* ░░ cabina ░░ */
        var cab = add(root, new Node(mm.cabLow, C.BL, { t: [0.30, 1.52, 0] }));
        add(cab, new Node(mm.pillar, C.BL, { t: [0.30 - 0.575, 2.05, 0.50] }));
        add(cab, new Node(mm.pillar, C.BL, { t: [0.30 + 0.575, 2.05, 0.50] }));
        add(cab, new Node(mm.pillar, C.BL, { t: [0.30 - 0.575, 2.05, -0.50] }));
        add(cab, new Node(mm.pillar, C.BL, { t: [0.30 + 0.575, 2.05, -0.50] }));
        var glassN = add(cab, new Node(mm.glass, C.GL, { t: [0.30, 2.05, 0], alpha: 0.26, spec: 0.9, shin: 90, tr: true }));
        var roof = add(cab, new Node(mm.roof, C.Y, { t: [0.30, 2.32, 0] }));
        add(roof, new Node(mm.lamp, C.Yl, { t: [0.80, 0.13, 0.36], emis: 0.55, spec: 0.5 }));
        add(roof, new Node(mm.lamp, C.Yl, { t: [0.80, 0.13, -0.36], emis: 0.55, spec: 0.5 }));
        var beacon = add(roof, new Node(mm.beacon, C.OR, { t: [0.95, 0.15, 0], emis: 0.9, spec: 0.6 }));

        /* escape */
        add(body, new Node(mm.pipe, C.DK, { t: [-0.44, 1.86, -0.34] }));
        add(body, new Node(mm.pipeCap, C.ST, { t: [-0.44, 2.46, -0.34] }));

        /* ░░ brazo del cargador frontal + cuchara azul ░░ */
        var front = add(root, new Node(null, C.Y, { t: [1.15, 1.50, 0], r: [0, 0, -0.30] }));
        add(front, new Node(mm.beam, C.Y, { t: [0, 0, 0.42] }));
        add(front, new Node(mm.beam, C.Y, { t: [0, 0, -0.42] }));
        add(front, new Node(mm.piston, C.ST, { t: [0.55, 0.26, 0.30], r: [0, 0, -0.35] }));
        add(front, new Node(mm.rod, C.DK, { t: [0.18, 0.32, 0.30], r: [0, 0, -0.35] }));
        var bk = add(front, new Node(null, C.BL, { t: [1.90, 0, 0], r: [0, 0, 0.42] }));
        add(bk, new Node(mm.bucket, C.BL, { t: [0, -0.42, 0] }));
        add(bk, new Node(mm.bucket, C.BLd, { t: [0, -0.42, 0], s: [0.92, 0.92, 0.92] }));
        for (i = 0; i < 3; i++) {
            add(bk, new Node(mm.tooth, C.BLd, { t: [0.50, -0.86, -0.34 + i * 0.34], r: [0, 0, -0.25] }));
        }

        /* ░░ brazo retroexcavador trasero + cuchara gris ░░ */
        var rear = add(root, new Node(null, C.Y, { t: [-2.35, 1.35, 0], r: [0, 0, 2.36] }));
        add(rear, new Node(mm.boom, C.Y, { t: [0, 0, 0] }));
        var st = add(rear, new Node(null, C.Y, { t: [1.45, 0, 0], r: [0, 0, 1.84] }));
        add(st, new Node(mm.stick, C.Y, { t: [0, 0, 0] }));
        var bkG = add(st, new Node(null, C.GY, { t: [1.60, 0, 0], r: [0, 0, 0.5] }));
        add(bkG, new Node(mm.bucketG, C.GY, { t: [0, -0.28, 0] }));

        /* ░░ ruedas ░░ */
        var wheels = [];
        var wr = [0, 0, 0];
        function mkWheel(x, y, z, rMesh, hMesh, rad) {
            var w = add(root, new Node(null, C.TK, { t: [x, y, z], r: [Math.PI / 2, 0, 0] }));
            var sp = add(w, new Node(null, C.TK, { r: [0, 0, 0] }));
            add(sp, new Node(rMesh, C.TK, { spec: 0.10, shin: 12 }));
            add(sp, new Node(hMesh, C.Y, { spec: 0.45, shin: 60 }));
            wheels.push({ node: sp, rad: rad, spin: 0 });
            return w;
        }
        mkWheel(-1.70, 0.60,  0.58, mm.wheelR, mm.hubR, 0.60);
        mkWheel(-1.70, 0.60, -0.58, mm.wheelR, mm.hubR, 0.60);
        mkWheel( 1.45, 0.40,  0.50, mm.wheelF, mm.hubF, 0.40);
        mkWheel( 1.45, 0.40, -0.50, mm.wheelF, mm.hubF, 0.40);
        wr = null;

        /* ░░ ingeniero ░░ */
        var eng = add(root, new Node(null, C.OR, { t: [-4.20, 0, 1.00] }));
        var bodyE = add(eng, new Node(null, C.OR, { t: [0, 0, 0] }));
        var legs = [], arms = [];
        function mkLeg(sx) {
            var l = add(bodyE, new Node(null, C.NV, { t: [sx * 0.09, 0.46, 0] }));
            add(l, new Node(mm.leg, C.NV, { t: [0, -0.21, 0] }));
            add(l, new Node(mm.boot, C.DK, { t: [0, -0.44, 0.03] }));
            legs.push(l); return l;
        }
        function mkArm(sx) {
            var a = add(bodyE, new Node(null, C.OR, { t: [sx * 0.215, 0.90, 0] }));
            add(a, new Node(mm.arm, C.OR, { t: [0, -0.18, 0] }));
            arms.push(a); return a;
        }
        mkLeg(-1); mkLeg(1); mkArm(-1); mkArm(1);
        var torso = add(bodyE, new Node(mm.torso, C.OR, { t: [0, 0.70, 0] }));
        add(torso, new Node(mm.stripe, C.OY, { t: [0, 0.12, 0] }));
        add(torso, new Node(mm.stripe, C.OY, { t: [0, -0.02, 0] }));
        var head = add(bodyE, new Node(mm.head, C.SK, { t: [0, 1.06, 0] }));
        add(head, new Node(mm.helmet, C.OY, { t: [0, 0.03, 0], s: [1, 0.8, 1] }));
        add(head, new Node(mm.brim, C.OR, { t: [0, 0.01, 0] }));

        /* ░░ conductor sentado ░░ */
        var drv = add(root, new Node(null, C.OR, { t: [0.30, 1.19, 0.05], vis: false }));
        add(drv, new Node(mm.seat, C.DK, { t: [0, 0.02, -0.12] }));
        var dtorso = add(drv, new Node(mm.torso, C.OR, { t: [0, 0.30, 0] }));
        add(dtorso, new Node(mm.stripe, C.OY, { t: [0, 0.10, 0] }));
        add(dtorso, new Node(mm.stripe, C.OY, { t: [0, -0.04, 0] }));
        var dhead = add(drv, new Node(mm.head, C.SK, { t: [0, 0.66, 0] }));
        add(dhead, new Node(mm.helmet, C.OY, { t: [0, 0.03, 0], s: [1, 0.8, 1] }));
        add(drv, new Node(mm.arm, C.OR, { t: [0.20, 0.42, 0.12], r: [0, 0, -0.95] }));
        var steer = add(drv, new Node(mm.steer, C.DK, { t: [0.36, 0.52, 0.22], r: [1.15, 0, 0] }));

        /* ░░ sombra sobre el suelo ░░ */
        var shadow = add(root, new Node(mm.disc, [0.02, 0.03, 0.05], {
            t: [-0.40, 0.015, 0], s: [3.6, 1, 1.15], alpha: 0.62, soft: 1, tr: true
        }));

        M = {
            root: root, wheels: wheels, front: front, rear: rear, beacon: beacon,
            glass: glassN, eng: eng, bodyE: bodyE, legs: legs, arms: arms, head: head,
            drv: drv, steer: steer, shadow: shadow, meshes: mm
        };
    }

    /* ─────────────────────────── cámara ─────────────────────────── */
    var CAM = { fov: 30 * Math.PI / 180, near: 0.5, far: 160, dist: 9, ox: 2.10, oy: 2.45, ty: 1.15, tx: 0 };
    var EYE = [0, 0, 0];
    function buildVP() {
        EYE[0] = CAM.tx + CAM.ox; EYE[1] = CAM.oy; EYE[2] = CAM.dist;
        mLookAt(VIEW, EYE, [CAM.tx, CAM.ty, 0], [0, 1, 0]);
        mPersp(PROJ, CAM.fov, cw / ch, CAM.near, CAM.far);
        mMul(PROJ, VIEW, VP);
    }
    function projectX(x) {
        var w = VP[3] * x + VP[15];
        return ((VP[0] * x + VP[12]) / w * 0.5 + 0.5) * cw;
    }
    function worldXForPixel(px) {
        var lo = -120, hi = 120, mid, i;
        for (i = 0; i < 46; i++) { mid = (lo + hi) / 2; if (projectX(mid) < px) lo = mid; else hi = mid; }
        return (lo + hi) / 2;
    }
    function screenPos(x, y, z) {
        var w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
        var cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12];
        var cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13];
        return { x: (cx / w * 0.5 + 0.5) * cw, y: (1 - (cy / w * 0.5 + 0.5)) * ch };
    }
    function resize() {
        if (!cv) return;
        var r = cv.getBoundingClientRect();
        cw = Math.max(1, Math.round(r.width)); ch = Math.max(1, Math.round(r.height));
        dpr = Math.min(global.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.round(cw * dpr)); H = Math.max(1, Math.round(ch * dpr));
        cv.width = W; cv.height = H;
        if (gl) gl.viewport(0, 0, W, H);
        var aspect = cw / ch, tan = Math.tan(CAM.fov / 2);
        CAM.dist = Math.max((12.6 / 2) / (tan * aspect), (4.15 / 2) / tan);
        buildVP();
        CAM.tx = worldXForPixel(cw / 2);
        buildVP();
    }

    /* ─────────────────────────── partículas ─────────────────────────── */
    var PN = 120, ptHead = 0, ptBuf = null, ptData = new Float32Array(PN * 8), ptN = 0;
    var pl = [];
    (function () { for (var i = 0; i < PN; i++) pl.push({ life: 0, max: 1, x:0,y:0,z:0, vx:0,vy:0,vz:0, size:0.15, grow:0, r:1,g:1,b:1 }); })();
    function spawn(x, y, z, vx, vy, vz, life, size, r, g, b, grow) {
        for (var i = 0; i < PN; i++) {
            var k = (ptHead + i) % PN;
            if (pl[k].life <= 0) {
                ptHead = (k + 1) % PN;
                var p = pl[k];
                p.life = life; p.max = life; p.x = x; p.y = y; p.z = z;
                p.vx = vx; p.vy = vy; p.vz = vz; p.size = size; p.grow = grow || 0;
                p.r = r; p.g = g; p.b = b;
                return;
            }
        }
    }
    function updateParticles(dt, st) {
        var i, p;
        for (i = 0; i < PN; i++) {
            p = pl[i];
            if (p.life <= 0) continue;
            p.life -= dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vy += (p.size > 0.2 ? 0.35 : -0.5) * dt;
            p.vx *= (1 - 0.9 * dt);
        }
        ptN = 0;
        for (i = 0; i < PN; i++) {
            p = pl[i];
            if (p.life <= 0) continue;
            var k = 1 - p.life / p.max, o = ptN * 8;
            ptData[o] = p.x; ptData[o+1] = p.y; ptData[o+2] = p.z;
            ptData[o+3] = p.size + p.grow * k;
            ptData[o+4] = Math.max(0, (1 - k) * (p.size > 0.2 ? 0.5 : 0.42));
            ptData[o+5] = p.r; ptData[o+6] = p.g; ptData[o+7] = p.b;
            ptN++;
        }
    }

    /* ─────────────────────────── animación ─────────────────────────── */
    var ENG_START = -4.20, ENG_CAB = -0.55, ENG_Z = 1.00, CAB_X = 0.30, CAB_FLOOR = 1.19;
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
    function animate(st, t, tl) {
        var seated = !!st.seated;
        M.eng.vis = !seated;
        M.drv.vis = seated;
        if (seated) { M.steer.r[1] = Math.sin(t / 620) * 0.42; return; }
        var walk = t < tl.walk, climb = (t >= tl.walk && t < tl.climb);
        if (walk) {
            var u = clamp(t / Math.max(1, tl.walk), 0, 1);
            M.eng.t[0] = lerp(ENG_START, ENG_CAB, u);
            M.eng.t[1] = 0; M.eng.t[2] = ENG_Z;
            var ph = u * 32;
            M.legs[0].r[2] = Math.sin(ph) * 0.55;
            M.legs[1].r[2] = -Math.sin(ph) * 0.55;
            M.arms[0].r[2] = -Math.sin(ph) * 0.48;
            M.arms[1].r[2] = Math.sin(ph) * 0.48;
            M.bodyE.t[1] = Math.abs(Math.sin(ph)) * 0.035;
            M.eng.alpha = 1;
        } else if (climb) {
            var c = clamp((t - tl.walk) / Math.max(1, tl.climb - tl.walk), 0, 1), e = ease(c);
            M.eng.t[0] = lerp(ENG_CAB, ENG_CAB + 0.14, e);
            M.eng.t[1] = e * CAB_FLOOR;
            M.eng.t[2] = lerp(ENG_Z, 0.86, e);
            M.legs[0].r[2] = -0.55 - c * 0.35; M.legs[1].r[2] = 0.30 - c * 0.2;
            M.arms[0].r[2] = -2.35; M.arms[1].r[2] = -2.05;
            M.bodyE.t[1] = 0;
            M.eng.alpha = 1;
        } else {
            var k = clamp((t - tl.climb) / Math.max(1, tl.cab - tl.climb), 0, 1), e2 = ease(k);
            M.eng.t[0] = lerp(ENG_CAB + 0.14, CAB_X, e2);
            M.eng.t[1] = CAB_FLOOR;
            M.eng.t[2] = lerp(0.86, 0.06, e2);
            M.legs[0].r[2] = -0.9; M.legs[1].r[2] = 0.1;
            M.arms[0].r[2] = -2.2; M.arms[1].r[2] = -1.9;
            M.bodyE.t[1] = 0;
            M.eng.alpha = 1 - k;
        }
    }

    /* ─────────────────────────── dibujo ─────────────────────────── */
    var scratch = m4();
    var nmArr = new Float32Array(9);
    var groundNode = null, gridNode = null;
    function drawMesh(m, node, inherited) {
        var mdl = mTRS(scratch, node.t, node.r, node.s);
        gl.uniformMatrix4fv(U.uM, false, mdl);
        nmArr[0]=mdl[0]; nmArr[1]=mdl[1]; nmArr[2]=mdl[2];
        nmArr[3]=mdl[4]; nmArr[4]=mdl[5]; nmArr[5]=mdl[6];
        nmArr[6]=mdl[8]; nmArr[7]=mdl[9]; nmArr[8]=mdl[10];
        gl.uniformMatrix3fv(U.uNM, false, nmArr);
        gl.uniform3f(U.uCol, node.col[0], node.col[1], node.col[2]);
        gl.uniform1f(U.uAlpha, node.alpha * inherited);
        gl.uniform1f(U.uSpec, node.spec);
        gl.uniform1f(U.uShin, node.shin);
        gl.uniform1f(U.uEmis, node.emis);
        gl.uniform1f(U.uSoft, node.soft);
        bindMesh(m);
        gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    function drawTree(node, parentMat, inherited, mode) {
        if (!node.vis) return;
        mDepth++;
        var out = MST[mDepth];
        mMul(parentMat, mTRS(scratch, node.t, node.r, node.s), out);
        var mine = inherited * node.alpha;
        if (node.mesh && (node.tr === (mode === 1))) drawMesh(node.mesh, node, inherited);
        var kids = node.kids;
        for (var i = 0; i < kids.length; i++) drawTree(kids[i], out, mine, mode);
        mDepth--;
    }
    function drawGroundPlane() {
        var mm = M.meshes;
        if (!groundNode) {
            groundNode = new Node(mm.plane, [0.02, 0.04, 0.07], { t: [0, 0, 0], alpha: 1.0 });
            gridNode = new Node(mm.grid, [0.10, 0.28, 0.52], { t: [0, 0.006, 0], alpha: 0.22, tr: true });
        }
        drawMesh(mm.plane, groundNode, 1);
    }
    function drawGrid() {
        if (!gridNode) { drawGroundPlane(); return; }
        drawMesh(M.meshes.grid, gridNode, 1);
    }
    function drawParticles() {
        if (!ptN) return;
        gl.useProgram(ppts);
        gl.uniformMatrix4fv(UP.uVP, false, VP);
        gl.uniform1f(UP.uPS, (H / 2) / Math.tan(CAM.fov / 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
        gl.bufferData(gl.ARRAY_BUFFER, ptData.subarray(0, ptN * 8), gl.DYNAMIC_DRAW);
        var st = 8 * 4;
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, st, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, st, 16);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, st, 20);
        gl.drawArrays(gl.POINTS, 0, ptN);
    }

    var lastHonk = -1, dustAcc = 0, smokeAcc = 0, lastMX = null, lastT = 0;
    function render(st) {
        if (!gl || !M) return;
        var t = st.t || 0, dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        var tl = st.tl || { walk: 0, climb: 0, cab: 0, seat: 0, start: 0 };
        var mx = st.mx || 0;

        M.root.t[0] = mx;
        var mx0 = (st.mx0 === undefined) ? mx : st.mx0;
        var travel = mx - mx0;
        for (var i = 0; i < M.wheels.length; i++) M.wheels[i].node.r[1] = -travel / M.wheels[i].rad;

        animate(st, t, tl);

        var bl = Math.sin(t / 170) > 0 ? 1 : 0.18;
        M.beacon.emis = 0.25 + 0.8 * bl;

        /* bocina: rebote del brazo + humo */
        if (st.honk !== undefined && st.honk !== lastHonk) {
            lastHonk = st.honk;
            for (var h = 0; h < 4; h++) {
                spawn(mx - 0.44 + Math.random() * 0.1, 2.5, -0.34, (Math.random() - 0.5) * 0.5,
                      0.9 + Math.random() * 0.7, (Math.random() - 0.5) * 0.4, 1.5, 0.16,
                      0.72, 0.77, 0.83, 0.22);
            }
        }
        var hk = (st.honk !== undefined) ? (t - st.honk) : 9999;
        var bump = (hk >= 0 && hk < 900) ? Math.sin((hk / 900) * Math.PI) * 0.13 : 0;
        M.front.r[2] = -0.30 - bump;

        /* polvo y humo de escape */
        var moving = lastMX === null ? false : (mx - lastMX) > 0.002;
        lastMX = mx;
        if (moving) {
            dustAcc += dt;
            if (dustAcc > 0.07) {
                dustAcc = 0;
                spawn(mx - 1.70 + (Math.random() - 0.5) * 0.5, 0.06, 0.58 + (Math.random() - 0.5) * 0.3,
                      -1.4 - Math.random() * 1.4, 0.35 + Math.random() * 0.55, (Math.random() - 0.5) * 0.4,
                      0.85, 0.12, 0.55, 0.60, 0.68, 0.10);
            }
        }
        if (st.engineOn) {
            smokeAcc += dt;
            if (smokeAcc > (moving ? 0.24 : 0.55)) {
                smokeAcc = 0;
                spawn(mx - 0.44, 2.52, -0.34, (Math.random() - 0.5) * 0.35, 1.0 + Math.random() * 0.6,
                      (Math.random() - 0.5) * 0.3, 1.7, 0.15, 0.70, 0.75, 0.82, 0.26);
            }
        }
        updateParticles(dt, st);

        /* ── render ── */
        gl.viewport(0, 0, W, H);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(U.uVP, false, VP);
        gl.uniform3f(U.uCam, EYE[0], EYE[1], EYE[2]);
        gl.uniform3f(U.uLdir, -0.38, 0.82, 0.42);
        gl.uniform3f(U.uLcol, 0.98, 0.95, 0.88);
        gl.uniform3f(U.uAmbT, 0.24, 0.30, 0.40);
        gl.uniform3f(U.uAmbB, 0.07, 0.10, 0.16);
        gl.uniform3f(U.uRim, 0.22, 0.52, 0.90);

        gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
        mDepth = 0;
        drawGroundPlane();
        mDepth = 0;
        drawTree(M.root, MST[0], 1, 0);

        gl.enable(gl.BLEND); gl.depthMask(false);
        mDepth = 0;
        drawGrid();
        mDepth = 0;
        drawTree(M.root, MST[0], 1, 1);
        drawParticles();
        gl.depthMask(true);
    }

    /* ─────────────────────────── API ─────────────────────────── */
    GML3D.init = function (canvas) {
        try {
            cv = canvas;
            if (!cv) return false;
            var opt = { alpha: true, antialias: true, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false };
            gl = cv.getContext('webgl', opt) || cv.getContext('experimental-webgl', opt);
            if (!gl) return false;
            prog = prog2(VS, FS); ppts = prog2(PVS, PFS);
            if (!prog || !ppts) return false;
            unis(prog, ['uVP','uM','uNM','uCol','uAlpha','uSpec','uShin','uEmis','uSoft','uLdir','uLcol','uAmbT','uAmbB','uRim','uCam'], U);
            unis(ppts, ['uVP','uPS'], UP);
            buildScene();
            ptBuf = gl.createBuffer();
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.clearColor(0, 0, 0, 0);
            resize();
            GML3D.ok = true;
            return true;
        } catch (e) { gl = null; return false; }
    };
    GML3D.resize = resize;
    GML3D.render = render;
    GML3D.worldXForPixel = function (px) { return worldXForPixel(px); };
    GML3D.screenPos = function (x, y, z) { return screenPos(x, y, z); };
    GML3D.dispose = function () {
        if (gl) { try { gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) {} }
        gl = null; GML3D.ok = false;
    };

    /* ═══════════════════════════ FIN DE PARTE 3 ═══════════════════════════ */
})(window);
