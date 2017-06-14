let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");

var width = window.innerWidth * 2;
var height = window.innerHeight * 2;

canvas.width = width;
canvas.height = height;
canvas.style.width = width / 2;
canvas.style.height = height / 2;
document.body.appendChild(canvas);

ctx.fillStyle = "#ff0000";
ctx.lineWidth = 10;
ctx.font = "40px Arial";


function rand_normal() {
    var V1, V2, S;
    do {
        var U1 = Math.random();
        var U2 = Math.random();
        V1 = 2 * U1 - 1;
        V2 = 2 * U2 - 1;
        S = V1 * V1 + V2 * V2;
    } while (S > 1);

    X = Math.sqrt(-2 * Math.log(S) / S) * V1;

    return X;
}

function randn(rows, cols) {
    let z = math.zeros([rows, cols]);
    z = math.map(z, function() {
        return rand_normal();
    });
    return z;
}

function randn_var(rows, cols, variance) {
    let z = math.zeros([rows, cols]);
    z = math.map(z, function() {
        return rand_normal() * variance;
    });
    return z;
}

function init_weights() {
    W = randn_var(DIM, DIM, .5);
}

function features(target) {
    let s = {x: width/2, y: height/2};
    let vect = {x: s.x - target.x, y: s.y - target.y};
    let norm = Math.sqrt(vect.x*vect.x + vect.y*vect.y);
    return [1, vect.x/norm, vect.y/norm];
}

function arm(angles) {
    let s = {x: width/2, y: height/2};
    let l = 200;

    ctx.beginPath();

    ctx.moveTo(s.x, s.y);
    for (let i = 0; i < angles.length; i++) {
        s = {x: s.x + Math.cos(angles[i])*l, y: s.y + Math.sin(angles[i])*l};
        ctx.lineTo(s.x, s.y);
    }

    ctx.stroke();

    return s;
}

function distance(a, b) {
    let xd = a.x - b.x;
    let yd = a.y - b.y;
    return Math.sqrt(xd*xd + yd*yd);
}

function get_angles(f, W, l) {
    let z = math.zeros(DIM);

    for (let i = 0; i < f.length; i ++) {
        z._data[i] = f[i];
    }

    z = math.multiply(z, W);
    z = math.map(z, Math.tanh);

    z = math.multiply(z, W);
    z = math.map(z, Math.tanh);

    z = math.multiply(z, W);

    let r = math.zeros(l);
    for (let i = 0; i < l; i ++) {
        r._data[i] = z._data[i];
    }

    return r._data;
}

window.onmousemove = function(evt) {
    mouse.x = evt.offsetX * 2;
    mouse.y = evt.offsetY * 2;
};

window.onkeydown = function(evt) {
    let key = evt.key;
    if (key == "r") {
        // randomize weidhts
        init_weights();
    } else if (key == "t") {
        training = !training;
    }
}

var mouse = {x: 0, y: 0};

let DIM = features(mouse).length + 4;
var W;
init_weights();

let avg_r = 0;
let learning_rate = 0.002;
let variance = .1;

var training = false;

function render() {
    window.requestAnimationFrame(render);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 10;

    if (training) {

        ctx.globalAlpha = .05;

        let samples = 100;
        let rs = new Array(samples);
        let candidates = [];
        for (let i = 0; i < samples; i ++) {
            let targ_angle = Math.random() * Math.PI;
            let d = Math.min(width, height)/2;
            let target = {x: width/2 + Math.cos(targ_angle) * d, y: height/2 + Math.sin(targ_angle) * d};

            ctx.fillRect(target.x-10, target.y-10, 20, 20);

            let f = features(target);

            let angles = get_angles(f, W, 2);
            let p1 = arm(angles);

            let W_noise = randn_var(DIM, DIM, variance);
            let W_mod = math.add(W, W_noise);
            angles = get_angles(f, W_mod, 2);
            let p2 = arm(angles);

            let dist1 = distance(p1, target);
            let dist2 = distance(p2, target);

            let r = dist1 - dist2;
            rs[i] = r;

            candidates.push(W_noise);
        }

        let mean = math.sum(rs)/samples;
        let std = math.std(rs);

        avg_r += (mean - avg_r) * .01;

        for (let i = 0; i < samples; i ++) {
            let update = math.multiply( learning_rate * (rs[i]-mean)/std, candidates[i] );
            W = math.add(W, update);
        }

        ctx.globalAlpha = 1;

        rs.sort(function(a,b) {
            return a - b;
        });

        let yoff = height/2;
        ctx.beginPath();
        ctx.moveTo(0, yoff);
        ctx.lineTo(width, yoff);
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1;
        for (let i = 0; i < rs.length; i ++) {
            let r = rs[i];
            if (i == 0) {
                ctx.moveTo(0, yoff-r);
            } else {
                ctx.lineTo(i * width/rs.length, yoff-r);
            }
        }
        ctx.stroke();

        ctx.fillText("average reward: " + Math.round(avg_r*100)/100, 10, 40);
        
    } else {
        ctx.globalAlpha = 1;

        let f = features(mouse);
        let angles = get_angles(f, W, 2);
        let p = arm(angles);
    }
}

render();