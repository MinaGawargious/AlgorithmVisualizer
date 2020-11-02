// OLD CODE. DO NOT USE.


let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

borderColor = "transparent";
fillColor = "orange";
textColor = "white";

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
} 

let h = 6;
let w = 4;
colors = ["Black", "Blue"];
let defs = document.createElementNS(svgns, "defs");
for (color of colors){
    for (distance of ["Near", "Far"]){
        let arrowheadMarker = document.createElementNS(svgns, "marker");
        setAttributes(arrowheadMarker, {"id": `arrowhead${color}_${distance}`, "markerWidth": w, "markerHeight": h, "refX": distance == "Near" ? 0 : w, "refY": w/2, "orient": "auto", "fill": color});
        let arrowhead = document.createElementNS(svgns, "polygon");
        arrowhead.setAttribute("points", `0 0, ${h} ${w/2}, 0 ${w}`);
        arrowheadMarker.appendChild(arrowhead);   
        defs.appendChild(arrowheadMarker);  
    }
}
svg.appendChild(defs);

let sourceNode = newLine = draggedItem = null;
let numNodes = 0;
// Upon moving the mouse to after clicking a node to create a new edge, the gradient will change as direction and length changes. currentGradient is the most updated gradient we added, so we can remove it when we NEXT move the mouse so there is only ever 1 extra line gradient (the current one) at a time, vs. a gradient fro each individual mousemove (potentially thousands).


let currentGradient = document.createElementNS(svgns, "linearGradient");

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [{lineObject, gradient}]
let func = () => {};

let algorithms = document.querySelectorAll(".dropdown li");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]]
    });
}






// TODO: update gradient function to be a solid black line, that ends at (x2, y2) - heightOfArrow. No gradient necessary, just stop black line.
function getGradient(x1, y1, x2, y2, id, x){
    let gradient = document.createElementNS(svgns, "linearGradient");
    let distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    setAttributes(gradient, {"id": id});
    let numerator = distance-3*w;
    let color1 = "black", color2 = "transparent";
    if(x2 < x1){
        numerator = 3*w;
        color1 = "transparent", color2 = "black";
    }
    let stop1 = document.createElementNS(svgns, "stop");
    let stop2 = document.createElementNS(svgns, "stop");
    if(distance == 0){
        distance = 0.001;
    }
    if(x){
    console.log("cutoff: ", numerator*100/distance);
    }
    setAttributes(stop1, {"offset":`${numerator*100/distance}%`, "stop-color": color1});
    setAttributes(stop2, {"offset":`${numerator*100/distance}%`, "stop-color": color2});
    gradient.append(stop1, stop2);
    return gradient;
}


svg.addEventListener("mousemove", (event) => {
    if(newLine != null){
        let x2 = event.offsetX;
        let y2 = event.offsetY;
        let priorX = sourceNode.cx.baseVal.value;
        let priorY = sourceNode.cy.baseVal.value;
        setAttributes(newLine, {"x2": x2, "y2": y2});
        [dx, dy] = getShifts(priorX, priorY, x2, y2);
        if(svg.contains(currentGradient)){
            svg.removeChild(currentGradient);
        }
        currentGradient = getGradient(priorX, priorY, x2, y2, `${x2}${y2}`, false);
        svg.appendChild(currentGradient);
        newLine.setAttribute("stroke", `url(#${x2}${y2})`);
    }else if(draggedItem != null){
        event.preventDefault();
        setAttributes(draggedItem, {"cx": event.offsetX, "cy": event.offsetY});
        setAttributes(draggedItem.nextElementSibling, {"x": event.offsetX-0.5, "y": event.offsetY+4});
        setAttributes(draggedItem.parentElement, {"x": event.offsetX, "y": event.offsetY});
        updateAllLines(draggedItem);
    }
})

// TODO: Update with unpacking arguments
function updateLine(line, x1, y1, x2, y2, g){
    if(x1 != undefined){
        line.setAttribute("x1", x1);
    }
    if(y1 != undefined){
        line.setAttribute("y1", y1);
    }
    if(x2 != undefined){
        line.setAttribute("x2", x2);
    }
    if(y2 != undefined){
        line.setAttribute("y2", y2);
    }
    if(g != undefined){
        line.setAttribute("stroke", `url(#${g.id})`);
    }
}

// For node's incoming edges, set x2 to newX and y2 to newY. For outgoing, set x1 to newX and y1 to newY. Adjust for double link.
//TODO: Find out why gradient is clear.
function updateAllLines(node){
    if(node == null || node == undefined || adjacencyList[node.id] == undefined){
        return;
    }
    // Handle outgoing + double link.
    for(let i = 0; i < adjacencyList[node.id].length; i++){
        let endNodeId = adjacencyList[node.id][i];
        let sourceNode = svg.getElementById(endNodeId);// source of incoming edge.
        let g2 = getGradient(node.cx.baseVal.value, node.cy.baseVal.value, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, lines[node.id][i].gradient.id, true); // Outgoing
        if(adjacencyList[endNodeId].includes(node.id)){
            // Double connection.
            let g1 = getGradient(sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)].gradient.id, false); // Incoming
            updateDoubleConnection(lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)].lineObject, lines[node.id][i].lineObject, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, g1, g2);
        }else{
            // Single connection. Just outgoing edge.
            updateLine(lines[node.id][i].lineObject, node.cx.baseVal.value, node.cy.baseVal.value, undefined, undefined, g2);
        }
    }

    for(let i = 0; i < Object.keys(adjacencyList).length; i++){
        if(adjacencyList[i].includes(node.id) && !adjacencyList[node.id].includes(i)){
            // Incoming edge, not doubly linked:
            let sourceNode = svg.getElementById(i);// source of incoming edge.
            let g = getGradient(node.cx.baseVal.value, node.cy.baseVal.value, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, lines[i][adjacencyList[i].indexOf(node.id)].gradient.id, false);
            updateLine(lines[i][adjacencyList[i].indexOf(node.id)].lineObject, undefined, undefined, node.cx.baseVal.value, node.cy.baseVal.value, g);
        }
    }
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

// (x1,y1) are coordinates of start of line of incoming edge. (x2, y2) is the tip.
function updateDoubleConnection(incoming, outgoing, x1, y1, x2, y2, g1, g2){
    let [dx, dy] = getShifts(x1, y1, x2, y2);
    updateLine(incoming, parseFloat(x1) - (w/2)*dx, parseFloat(y1) - (w/2)*dy, parseFloat(x2) - (w/2)*dx, parseFloat(y2) - (w/2)*dy, g1);
    updateLine(outgoing, parseFloat(x2) + (w/2)*dx, parseFloat(y2) + (w/2)*dy, parseFloat(x1) + (w/2)*dx, parseFloat(y1) + (w/2)*dy, g2);
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
        if(sourceNode == null){ // First node.
            sourceNode = node;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": node.cx.baseVal.value, "y1": node.cy.baseVal.value, "x2": node.cx.baseVal.value, "y2": node.cy.baseVal.value, "style": "stroke-width:4",  "marker-end": "url(#arrowheadBlackNear)", "pointer-events": "none", "stroke": "black"});
            svg.appendChild(newLine);
        }else if (sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id)) { // Second node to establish connection.
            adjacencyList[sourceNode.id].push(node.id);

            let priorX = node.cx.baseVal.value;
            let priorY = node.cy.baseVal.value;
            // Deep copy of current gradient:
            let gradient = getGradient(priorX, priorY, node.cx.baseVal.value, node.cy.baseVal.value, `${sourceNode.id}_${node.id}`, true);
            svg.appendChild(gradient);
            svg.removeChild(currentGradient);
            // If nodes already have an edge connecting them the other way, adjust positions:
            if(adjacencyList[node.id].includes(sourceNode.id)){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index].lineObject;
                updateDoubleConnection(newLine, outgoing, priorX, priorY, node.cx.baseVal.value, node.cy.baseVal.value, gradient, undefined);
            }else{
                updateLine(newLine, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, gradient);
            }
            
            lines[sourceNode.id].push({lineObject: newLine, gradient: gradient});
            newLine = sourceNode = null;
        }
    });
    svg.addEventListener("mousedown", (event) => {
        draggedItem = event.target;
    })
    svg.addEventListener("mouseup", (event) => {
        draggedItem = null;
    })
});

