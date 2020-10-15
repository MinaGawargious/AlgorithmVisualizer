let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

borderColor = "transparent"
fillColor = "orange"
textColor = "white";

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
} 

h = 4
w = 6
colors = ["Black", "Blue"];
let defs = document.createElementNS(svgns, "defs");
for (color of colors){
    let arrowheadLine = document.createElementNS(svgns, "marker");
    setAttributes(arrowheadLine, {"id": `arrowhead${color}`, "markerWidth": w, "markerHeight": h, "refX": w, "refY": h/2, "orient": "auto", "fill": color});
    let arrowhead = document.createElementNS(svgns, "polygon");
    arrowhead.setAttribute("points", `0 0, ${w} ${h/2}, 0 ${h}`);
    arrowheadLine.appendChild(arrowhead);   
    defs.appendChild(arrowheadLine);  
}
svg.appendChild(defs);


let priorX, priorY;
let priorNode = newLine = draggedItem = null;
let numNodes = 0;
// Upon moving the mouse to after clicking a node to create a new edge, the gradient will change as direction and length changes. currentGradient is the most updated gradient we added, so we can remove it when we NEXT move the mouse so there is only ever 1 extra line gradient (the current one) at a time, vs. a gradient fro each individual mousemove (potentially thousands).
currentGradient = document.createElementNS(svgns, "linearGradient");
let stop1Current = document.createElementNS(svgns, "stop");
let stop2Current = document.createElementNS(svgns, "stop");

let playBut = document.getElementsByClassName("playBut")[0];
let adjacencyList = {};
let lines = {}; // {lineObject, end, gradient}
let func = () => {};

playBut.addEventListener("click", () => {
    func();
})

let algorithms = document.querySelectorAll(".dropdown li");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]]
    });
}

svg.addEventListener("mousemove", (event) => {
    if(newLine != null){
        console.log("NEW LINE")
        let x2 = event.offsetX;
        let y2 = event.offsetY;
        setAttributes(newLine, {"x2": x2, "y2": y2});
        let theta = Math.atan((y2-priorY)/(priorX-x2)); 
        let dx = Math.cos(theta);
        let dy = Math.sin(theta);
        if(priorY > y2){ 
            dx = -dx
            dy = -dy;
        }
        if(svg.contains(currentGradient)){
            svg.removeChild(currentGradient);
        }
        let distance = Math.sqrt((x2-priorX)*(x2-priorX) + (y2-priorY)*(y2-priorY));
        setAttributes(currentGradient, {"id": `${x2}${y2}`})
        let numerator = distance-3*w;
        let color1 = "black", color2 = "transparent";
        if(x2 < priorX){
            numerator = 3*w;
            color1 = "transparent", color2 = "black";
        }
        setAttributes(stop1Current, {"offset":`${numerator*100/distance}%`, "stop-color": color1});
        setAttributes(stop2Current, {"offset":`${numerator*100/distance}%`, "stop-color": color2});
        currentGradient.append(stop1Current, stop2Current);
        svg.appendChild(currentGradient);
        newLine.setAttribute("stroke", `url(#${x2}${y2})`);
    }else if(draggedItem != null){
        console.log(draggedItem);
        event.preventDefault();
        setAttributes(draggedItem, {"cx": event.offsetX, "cy": event.offsetY});
        setAttributes(draggedItem.nextElementSibling, {"x": event.offsetX-0.5, "y": event.offsetY+4});
        setAttributes(draggedItem.parentElement, {"x": event.offsetX, "y": event.offsetY});
        //********************TODO********************: update lines on drag, both outgoing and incoming, adjusting if nodes are connected on both sides.
        updateAllLines(draggedItem, event.offsetX, event.offsetY);
    }
})

function updateLine(line, x1, y1, x2, y2, g){
    setAttributes(line, {"x1": x1, "y1": y1, "x2": x2, "y2": y2});
    if(g != undefined){
        line.setAttribute("stroke", `url(#${g.id})`);
    }
}

// For node's incoming edges, set x2 to newX and y2 to newY. For outgoing, set x1 to newX and y1 to newY. Adjust for double link.
function updateAllLines(node, newX, newY){
    
}

function getShifts(xOriginal, yOrignal, xClicked, yClicked){
    let theta = Math.atan((yClicked-yOrignal)/(xOriginal-xClicked));
    let dx = Math.sin(theta);
    let dy = Math.cos(theta);
    if(xOriginal < yOrignal){ 
        dx = -dx
        dy = -dy;
    }
    return [dx, dy]
}

function updateConnections(node){
    // Shift outgoing edges around. If double connection, x's and y's won't simply be centers.
    let outgoingList = lines[node.id];
    for(outgoing of outgoingList){

        let [dx, dy] = getShifts(node.cx.baseVal.value, node.cy.baseVal.value, outgoing.lineObject.x2.baseVal.value, outgoing.lineObject.y2.baseVal.value);
        updateLine()
    }
}

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", () => {
    let radius = window.innerWidth/30;
    let group = document.createElementNS(svgns, "g");
    let node = document.createElementNS(svgns, "circle");
    setAttributes(node, {"r" : radius, "cx" :  Math.random() * svg.width.baseVal.value, "cy": Math.random() * svg.height.baseVal.value, "fill": fillColor, "style": `stroke:${borderColor};stroke-width:4`, "id": numNodes});

    let newText = document.createElementNS(svgns, "text");
    setAttributes(newText, {"text-anchor": "middle", "x": parseFloat(node.cx.baseVal.value)-0.5, "y": parseFloat(node.cy.baseVal.value)+4, "font-weight": "bold", "font-size": "16", "fill": textColor, "class": "disableSelect"});
    newText.textContent = numNodes;
    adjacencyList[numNodes] = []
    lines[numNodes++] = []
    group.append(node, newText);
    svg.appendChild(group);
    
    group.addEventListener("click", (event) => {
        console.log("Node clicked");
        if(priorNode == null){ // First node.
            priorX = node.cx.baseVal.value;
            priorY = node.cy.baseVal.value;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": priorX, "y1": priorY, "x2": priorX, "y2": priorY, "style": "stroke-width:4",  "marker-end": "url(#arrowheadBlack)", "pointer-events": "none", "stroke": "black"});
            svg.appendChild(newLine);
            priorNode = node;
        }else if ((priorX != node.cx.baseVal.value || priorY != node.cy.baseVal.value) && !adjacencyList[priorNode.id].includes(node.id)) { // Second node to establish connection.
            adjacencyList[priorNode.id].push(node.id);

            let gradient = document.createElementNS(svgns, "linearGradient");
            let stop1 = document.createElementNS(svgns, "stop");
            let stop2 = document.createElementNS(svgns, "stop");

            setAttributes(gradient, {"id": `${priorNode.id}_${node.id}`})
            setAttributes(stop1, {"offset":`${stop1Current.getAttribute("offset")}`, "stop-color": stop1Current.getAttribute("stop-color")}); // Deep copy.
            setAttributes(stop2, {"offset":`${stop2Current.getAttribute("offset")}`, "stop-color": stop2Current.getAttribute("stop-color")}); // Deep
            gradient.append(stop1, stop2);
            svg.appendChild(gradient);
            svg.removeChild(currentGradient);
            // If nodes already have an edge connecting them the other way, adjust positions:
            if(adjacencyList[node.id].includes(priorNode.id)){ // Outgoing edge already exists. Incoming being created.
                let [dx, dy] = getShifts(priorX, priorY, node.cx.baseVal.value, node.cy.baseVal.value);
                let index = adjacencyList[node.id].indexOf(`${priorNode.id}`);
                let outgoing = lines[node.id][index].lineObject;

                updateLine(outgoing, parseFloat(node.cx.baseVal.value) + (w/2)*dx, parseFloat(node.cy.baseVal.value) + (w/2)*dy, parseFloat(priorX) + (w/2)*dx, parseFloat(priorY) + (w/2)*dy, undefined);
                updateLine(newLine, parseFloat(priorX) - (w/2)*dx, parseFloat(priorY) - (w/2)*dy, parseFloat(node.cx.baseVal.value) - (w/2)*dx, parseFloat(node.cy.baseVal.value) - (w/2)*dy, gradient);
            }else{
                updateLine(newLine, priorX, priorY, node.cx.baseVal.value, node.cy.baseVal.value, gradient);
            }
            
            lines[priorNode.id].push({lineObject: newLine, end: node.id, gradient: gradient});
            newLine = priorNode = null;
        }
    });
    svg.addEventListener("mousedown", (event) => {
        console.log(event.target);
        draggedItem = event.target;
    })
    svg.addEventListener("mouseup", (event) => {
        console.log("mouseup")
        draggedItem = null;
    })
});

// TODO: Add weights and orient label correctly.
// TODO: Upon running, make transparent gradient for blue.
// TODO: Allow node movement (click and drag).
// TODO: Allow for deleted nodes (delete number 2 of 7, next number is 2, not 8). 