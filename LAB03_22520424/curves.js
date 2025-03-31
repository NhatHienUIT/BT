// WebGL context and program setup
let gl;
let program;
let positionAttributeLocation;
let colorUniformLocation;

// Current drawing mode
let currentMode = 'function';

// Initialize WebGL when page loads
window.onload = function() {
    initWebGL();
    setupEventListeners();
    drawFunctionGraph(); // Start with function graph as default
};

// Initialize WebGL context and shaders
function initWebGL() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    
    if (!gl) {
        alert('Your browser does not support WebGL');
        return;
    }
    
    // Set canvas resolution
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Load shaders
    const vertexShaderSource = document.getElementById('vertex-shader').text;
    const fragmentShaderSource = document.getElementById('fragment-shader').text;
    
    // Create and compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
        return;
    }
    
    // Create and compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
        return;
    }
    
    // Create shader program
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return;
    }
    
    // Use the program
    gl.useProgram(program);
    
    // Get attribute and uniform locations
    positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    colorUniformLocation = gl.getUniformLocation(program, 'u_color');
    
    // Enable attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
    
    // Clear screen
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Update current mode
            currentMode = tabName;
            
            // Redraw based on the selected tab
            if (tabName === 'function') {
                drawFunctionGraph();
            } else if (tabName === 'bezier') {
                drawBezierCurve();
            } else if (tabName === 'hermite') {
                drawHermiteCurve();
            } else if (tabName === 'flower') {
                drawFlower();
            }
        });
    });
    
    // Button event listeners
    document.getElementById('draw-function').addEventListener('click', drawFunctionGraph);
    document.getElementById('draw-bezier').addEventListener('click', drawBezierCurve);
    document.getElementById('add-bezier-point').addEventListener('click', addBezierPoint);
    document.getElementById('draw-hermite').addEventListener('click', drawHermiteCurve);
    document.getElementById('draw-flower').addEventListener('click', drawFlower);
}

// 1. Function Graph Drawing
function drawFunctionGraph() {
    clearCanvas();
    
    // Get function and range
    const functionExpr = document.getElementById('function-expr').value;
    const xMin = parseFloat(document.getElementById('x-min').value);
    const xMax = parseFloat(document.getElementById('x-max').value);
    
    // Validate inputs
    if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) {
        alert('Vui lòng nhập khoảng giá trị x hợp lệ.');
        return;
    }
    
    try {
        // Create f(x) function from expression
        const f = new Function('x', 'return ' + functionExpr);
        
        // Test function with a value to catch errors
        f(0);
        
        // Create vertices for the graph
        const points = [];
        const steps = 500; // Number of segments
        
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (xMax - xMin) * (i / steps);
            let y;
            
            try {
                y = f(x);
                
                // Skip if y is NaN, Infinity, etc.
                if (!isFinite(y)) continue;
                
                // Normalize to WebGL coordinates (-1 to 1)
                const range = Math.max(Math.abs(xMax), Math.abs(xMin));
                const normalizedX = x / range;
                const normalizedY = y / range;
                
                // Add point if it's within range
                if (normalizedX >= -1 && normalizedX <= 1 && 
                    normalizedY >= -1 && normalizedY <= 1) {
                    points.push(normalizedX, normalizedY);
                }
            } catch (e) {
                // Skip points where function is undefined
                continue;
            }
        }
        
        // Draw coordinate axes
        drawAxes();
        
        // Draw the function graph
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Set color to blue
        gl.uniform4fv(colorUniformLocation, [0.0, 0.0, 1.0, 1.0]);
        
        // Draw the line
        gl.drawArrays(gl.LINE_STRIP, 0, points.length / 2);
        
    } catch (e) {
        alert('Lỗi khi tính toán hàm số: ' + e.message);
        console.error('Function evaluation error:', e);
    }
}

// 2. Bezier Curve Drawing
function drawBezierCurve() {
    clearCanvas();
    
    // Get control points
    const controlPoints = [];
    const pointControls = document.querySelectorAll('#bezier-points .point-control');
    
    pointControls.forEach(control => {
        const xInput = control.querySelector('.point-x');
        const yInput = control.querySelector('.point-y');
        
        const x = parseFloat(xInput.value);
        const y = parseFloat(yInput.value);
        
        if (!isNaN(x) && !isNaN(y)) {
            controlPoints.push({ x, y });
        }
    });
    
    if (controlPoints.length < 2) {
        alert('Cần ít nhất 2 điểm điều khiển.');
        return;
    }
    
    // Draw coordinate axes
    drawAxes();
    
    // Draw control points
    const controlPointsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointsBuffer);
    
    const pointsData = [];
    controlPoints.forEach(point => {
        pointsData.push(point.x, point.y);
    });
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsData), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw control points in red
    gl.uniform4fv(colorUniformLocation, [1.0, 0.0, 0.0, 1.0]);
    gl.drawArrays(gl.POINTS, 0, controlPoints.length);
    
    // Draw control polygon
    gl.drawArrays(gl.LINE_STRIP, 0, controlPoints.length);
    
    // Calculate and draw Bezier curve
    const bezierPoints = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const point = calculateBezierPoint(t, controlPoints);
        bezierPoints.push(point.x, point.y);
    }
    
    const bezierBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bezierBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bezierPoints), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw Bezier curve in green
    gl.uniform4fv(colorUniformLocation, [0.0, 0.8, 0.0, 1.0]);
    gl.drawArrays(gl.LINE_STRIP, 0, bezierPoints.length / 2);
}

// Calculate point on Bezier curve using De Casteljau's algorithm
function calculateBezierPoint(t, points) {
    if (points.length === 1) {
        return points[0];
    }
    
    const newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
        newPoints.push({
            x: (1 - t) * points[i].x + t * points[i + 1].x,
            y: (1 - t) * points[i].y + t * points[i + 1].y
        });
    }
    
    return calculateBezierPoint(t, newPoints);
}

// Add a new control point for Bezier curve
function addBezierPoint() {
    const bezierPoints = document.getElementById('bezier-points');
    const pointCount = bezierPoints.querySelectorAll('.point-control').length;
    
    const newPoint = document.createElement('div');
    newPoint.className = 'point-control';
    newPoint.innerHTML = `
        <span>P${pointCount}:</span>
        <input type="number" class="point-x" value="0.0" step="0.1">
        <input type="number" class="point-y" value="0.0" step="0.1">
    `;
    
    bezierPoints.appendChild(newPoint);
}

// 3. Hermite Curve Drawing
function drawHermiteCurve() {
    clearCanvas();
    
    // Get Hermite parameters
    const p0x = parseFloat(document.getElementById('hermite-p0-x').value);
    const p0y = parseFloat(document.getElementById('hermite-p0-y').value);
    const v0x = parseFloat(document.getElementById('hermite-v0-x').value);
    const v0y = parseFloat(document.getElementById('hermite-v0-y').value);
    const p1x = parseFloat(document.getElementById('hermite-p1-x').value);
    const p1y = parseFloat(document.getElementById('hermite-p1-y').value);
    const v1x = parseFloat(document.getElementById('hermite-v1-x').value);
    const v1y = parseFloat(document.getElementById('hermite-v1-y').value);
    
    // Validate inputs
    if ([p0x, p0y, v0x, v0y, p1x, p1y, v1x, v1y].some(isNaN)) {
        alert('Vui lòng nhập tất cả các giá trị hợp lệ.');
        return;
    }
    
    // Draw coordinate axes
    drawAxes();
    
    // Draw control points
    const controlPoints = [
        p0x, p0y,
        p1x, p1y
    ];
    
    const controlPointsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(controlPoints), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw control points in red
    gl.uniform4fv(colorUniformLocation, [1.0, 0.0, 0.0, 1.0]);
    gl.drawArrays(gl.POINTS, 0, 2);
    
    // Draw control polygon
    gl.drawArrays(gl.LINES, 0, 2);
    
    // Draw tangent vectors
    const tangents = [
        p0x, p0y,
        p0x + v0x * 0.1, p0y + v0y * 0.1,
        p1x, p1y,
        p1x + v1x * 0.1, p1y + v1y * 0.1
    ];
    
    const tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw tangent vectors in purple
    gl.uniform4fv(colorUniformLocation, [0.5, 0.0, 0.5, 1.0]);
    gl.drawArrays(gl.LINES, 0, 4);
    
    // Calculate and draw Hermite curve
    const hermitePoints = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const h1 = 2*t*t*t - 3*t*t + 1;
        const h2 = -2*t*t*t + 3*t*t;
        const h3 = t*t*t - 2*t*t + t;
        const h4 = t*t*t - t*t;
        
        const x = h1 * p0x + h2 * p1x + h3 * v0x + h4 * v1x;
        const y = h1 * p0y + h2 * p1y + h3 * v0y + h4 * v1y;
        
        hermitePoints.push(x, y);
    }
    
    const hermiteBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hermiteBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hermitePoints), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw Hermite curve in green
    gl.uniform4fv(colorUniformLocation, [0.0, 0.8, 0.0, 1.0]);
    gl.drawArrays(gl.LINE_STRIP, 0, hermitePoints.length / 2);
}

// 4. Flower Curve Drawing
function drawFlower() {
    clearCanvas();
    
    // Get parameters
    const n = parseInt(document.getElementById('petal-count').value);
    const steps = parseInt(document.getElementById('t-steps').value);
    
    // Validate inputs
    if (isNaN(n) || n < 1) {
        alert('Số cánh hoa phải là số nguyên dương.');
        return;
    }
    
    // Draw coordinate axes
    drawAxes();
    
    // Calculate flower curve points
    const flowerPoints = [];
    
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI;
        const x = Math.cos(n * t) * Math.cos(t);
        const y = Math.cos(n * t) * Math.sin(t);
        flowerPoints.push(x, y);
    }
    
    const flowerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, flowerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flowerPoints), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw flower curve in red
    gl.uniform4fv(colorUniformLocation, [1.0, 0.2, 0.2, 1.0]);
    gl.drawArrays(gl.LINE_STRIP, 0, flowerPoints.length / 2);
}

// Draw coordinate axes
function drawAxes() {
    const axesData = [
        -1.0, 0.0,  // X-axis
        1.0, 0.0,
        0.0, -1.0,  // Y-axis
        0.0, 1.0
    ];
    
    const axesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axesData), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw axes in gray
    gl.uniform4fv(colorUniformLocation, [0.5, 0.5, 0.5, 1.0]);
    gl.drawArrays(gl.LINES, 0, 4);

}

// Clear canvas
function clearCanvas() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}