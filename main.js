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
ctx.lineJoin = "round";


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

function randn_sigma(rows, cols, sigma) {
    let z = math.zeros([rows, cols]);
    z = math.map(z, function() {
        return rand_normal() * sigma;
    });
    return z;
}

function init_weights() {
    W = randn_sigma(DIM, DIM, .1);
}

function features(target) {
    let s = {x: width/2, y: height/2};
    let vect = {x: s.x - target.x, y: s.y - target.y};
    //let angle = Math.atan2(vect.y, vect.x);
    return [1, vect.x/500, vect.y/500];
}   

function feed_forward(f, W, l) {
    let z = math.zeros(DIM);

    for (let i = 0; i < DIM; i ++) {
        if (i < f.length) {
            z._data[i] = f[i];
        } else {
            z._data[i] = 1;
        }
    }

    z = math.multiply(z, W);
    z = math.map(z, Math.tanh);
    z._data[0] = 1;

    z = math.multiply(z, W);
    z = math.map(z, Math.tanh);
    z._data[0] = 1;

    z = math.multiply(z, W);

    /*
    let s = {x: width/2 + z._data[0]*100, y: height/2 + z._data[1]*100};
    */

    // draw arm

    let r = math.zeros(l);
    for (let i = 0; i < l; i ++) {
        r._data[i] = z._data[i] * 2 * Math.PI;
    }

    let angles = r._data;

    let s = {x: width/2, y: height/2};

    ctx.beginPath();

    ctx.moveTo(s.x, s.y);
    for (let i = 0; i < angles.length; i++) {
        s = {x: s.x + Math.cos(angles[i])*length, y: s.y + Math.sin(angles[i])*length};
        ctx.lineTo(s.x, s.y);
    }

    ctx.stroke();
    


    ctx.fillRect(s.x-20, s.y-20, 40, 40);
    return s;
}

function distance_2(a, b) {
    let xd = a.x - b.x;
    let yd = a.y - b.y;
    return xd*xd + yd*yd;
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
let learning_rate = .2;
let sigma = .02;

var samples = 1000;
var rs = new Array(samples);

// arm
var segments = 5;
var length = 200;

var training = false;


function render() {
    window.requestAnimationFrame(render);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 10;

    if (training) {
        ctx.save();
        ctx.globalAlpha = .02;
        
        let candidates = [];
        for (let i = 0; i < samples; i ++) {
            let targ_angle = Math.random() * Math.PI * 2;
            let d = Math.random() * 800;
            let target = {x: width/2 + Math.cos(targ_angle) * d, y: height/2 + Math.sin(targ_angle) * d};

            ctx.fillStyle = "#000000";
            ctx.fillRect(target.x-10, target.y-10, 20, 20);

            let f = features(target);

            // arm from weights
            ctx.fillStyle = "#0000ff";
            let p1 = feed_forward(f, W, segments);

            // arm from modified weights
            let W_noise = randn_sigma(DIM, DIM, sigma);
            let W_mod = math.add(W, W_noise);
            ctx.fillStyle = "#ff0000";
            let p2 = feed_forward(f, W_mod, segments);

            let r1 = -distance_2(p1, target);
            let r2 = -distance_2(p2, target);

            let r = r2 - r1;
            rs[i] = r;

            candidates.push(W_noise);
        }

        let mean = math.sum(rs)/samples;
        let std = math.std(rs);

        avg_r += (mean - avg_r) * .01;

        let weighted_avg = math.zeros([DIM, DIM]);

        for (let i = 0; i < samples; i ++) {
            let u = math.multiply(  (rs[i]-mean)/std, candidates[i] );
            weighted_avg = math.add(weighted_avg, u)
        }

        W = math.add(W, math.multiply(learning_rate/(samples*sigma), weighted_avg));
        ctx.restore();
    } else {
        ctx.globalAlpha = 1;

        let f = features(mouse);
        ctx.fillStyle = "#0000ff";
        let p = feed_forward(f, W, segments);
    }
}

render();