let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
} 

borderColor = "transparent";
fillColor = "orange";
textColor = "white";
let numNodes = 0;
let sourceNode = newLine = draggedItem = null;

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [{lineObject, gradient}]
let func = () => {};

let algorithms = document.querySelectorAll(".dropdown li");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]]
    });
}

let h = 6;
let w = 4;
let defs = document.createElementNS(svgns, "defs");

for (color of ["Black", "Blue"]){
    for (distance of ["Near", "Far"]){
        let arrowheadMarker = document.createElementNS(svgns, "marker");
        setAttributes(arrowheadMarker, {"id": `arrowhead${color}_${distance}`, "markerWidth": h, "markerHeight": w, "refX": distance == "Far" ? 0 : h, "refY": w/2, "orient": "auto", "fill": color});
        let arrowhead = document.createElementNS(svgns, "polygon");
        arrowhead.setAttribute("points", `0 0, ${h} ${w/2}, 0 ${w}`);
        arrowheadMarker.appendChild(arrowhead);   
        defs.appendChild(arrowheadMarker);  
    }
}
svg.appendChild(defs);

// Returns stroke, arrowhead, and end coordinates.
function getLineProperties(x1, y1, x2, y2){
    let distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    if(distance > 4*h){
        let theta = Math.atan((x2-x1)/(y1-y2));
        let dx = 4*h*Math.sin(theta); // The 4 is from the stroke width.
        let dy = 4*h*Math.cos(theta);
        if(y2 > y1){
            dx = -dx;
            dy = -dy;
        }
        return [x2-dx, y2+dy, "black", "arrowheadBlack_Far"]
    }
    return [x2, y2, "transparent", "arrowheadBlack_Near"]
}

// Used to shift when we create a double connection and when we drag. (x1, y1) is source point, (x2, y2) is end point.
function updateDoubleConnection(incoming, outgoing, x1, y1, x2, y2){
    let theta = Math.atan((x2-x1)/(y1-y2));

    let dx = Math.cos(theta); 
    let dy = Math.sin(theta);
    if(y2 > y1){
        dx = -dx;
        dy = -dy;
    }
    
    let [incomingX2, incomingY2, incomingArrowheadColor, incomingArrowhead] = getLineProperties(x1, y1, x2, y2);
    let [outgoingX2, outgoingY2, outgoingArrowheadColor, outgoingArrowhead] = getLineProperties(x2, y2, x1, y1);

    setAttributes(incoming, {"x1": parseFloat(x1) - w*dx, "y1": parseFloat(y1) - w*dy, "x2": parseFloat(incomingX2) - w*dx, "y2": parseFloat(incomingY2) - w*dy, "stroke": incomingArrowheadColor, "marker-end": `url(#${incomingArrowhead})`})
    setAttributes(outgoing, {"x1": parseFloat(x2) + w*dx, "y1": parseFloat(y2) + w*dy, "x2": parseFloat(outgoingX2) + w*dx, "y2": parseFloat(outgoingY2) + w*dy, "stroke": outgoingArrowheadColor, "marker-end": `url(#${outgoingArrowhead})`})    
}

function updateSingleConnection(line, x1, y1, x2, y2){
    let theta = Math.atan((x2-x1)/(y1-y2));

    let dx = Math.cos(theta); 
    let dy = Math.sin(theta);
    if(y2 > y1){
        dx = -dx;
        dy = -dy;
    }
    let [lineX2, lineY2, lineArrowheadColor, lineArrowhead] = getLineProperties(x1, y1, x2, y2);
    setAttributes(line, {"x1": parseFloat(x1), "y1": parseFloat(y1), "x2": parseFloat(lineX2), "y2": parseFloat(lineY2), "stroke": lineArrowheadColor, "marker-end": `url(#${lineArrowhead})`})
}

// Set incoming (x2, y2) to cursor x and y (account for offset for arrowhead, so go through getLineProperties function). Set outgoing (x1, y1) to cursor x and y and (x2, y2) to account for possible proximity. Update double connections if both incoming and outgoing.
function updateAllLines(node){
    // Outgoing + double connection
    let x1 = node.cx.baseVal.value, y1 = node.cy.baseVal.value;
    // Incoming:
    for(let i = 0; i < Object.keys(adjacencyList).length; i++){
        console.log(i);
        if(adjacencyList[i].includes(node.id)){
            let incoming = lines[i][adjacencyList[i].indexOf(node.id)];
            let endNode = svg.getElementById(i);
            let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
            updateSingleConnection(incoming, x2, y2, x1, y1);
        }
    }
    
    for(let i = 0; i < adjacencyList[node.id].length; i++){
        let endNodeId = adjacencyList[node.id][i];
        let endNode = svg.getElementById(endNodeId);
        let outgoing = lines[node.id][i];
        let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
        // Just outgoing edges.
        if(!adjacencyList[endNodeId].includes(node.id)){
            updateSingleConnection(outgoing, x1, y1, x2, y2);
        }else{ // Double connection
            let incoming = lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)];
            updateDoubleConnection(incoming, outgoing, x2, y2, x1, y1);
        }
    }   
}

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", (event) => {
    // Create new node.
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
        if(sourceNode == null){
            sourceNode = node;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": node.cx.baseVal.value, "y1": node.cy.baseVal.value, "x2": node.cx.baseVal.value, "y2": node.cy.baseVal.value, "style": "stroke-width:4",  "marker-end": "url(#arrowheadBlack_Near)", "pointer-events": "none", "stroke": "black"});
            svg.appendChild(newLine);  
        }else if(sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id)){ // Second node to establish connection.
            adjacencyList[sourceNode.id].push(node.id);

            let [lineX, lineY, lineStroke, arrowhead] = getLineProperties(sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            setAttributes(newLine, {"x2": lineX, "y2": lineY, "stroke": lineStroke, "marker-end": `url(#${arrowhead})`});

            if(adjacencyList[node.id].includes(sourceNode.id)){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index]; // newLine is incoming.
                updateDoubleConnection(newLine, outgoing, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            }
            lines[sourceNode.id].push(newLine);
            newLine = sourceNode = null;
        }
    });
});

svg.addEventListener("mousemove", (event) => {
    if(newLine != null){
        let [lineX, lineY, lineStroke, arrowhead] = getLineProperties(sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, event.offsetX, event.offsetY);
        setAttributes(newLine, {"x2": lineX, "y2": lineY, "stroke": lineStroke, "marker-end": `url(#${arrowhead})`});
    }else if(draggedItem != null){
        event.preventDefault();
        setAttributes(draggedItem, {"cx": event.offsetX, "cy": event.offsetY});
        setAttributes(draggedItem.nextElementSibling, {"x": event.offsetX-0.5, "y": event.offsetY+4});
        setAttributes(draggedItem.parentElement, {"x": event.offsetX, "y": event.offsetY});
        updateAllLines(draggedItem);
    }
})

svg.addEventListener("mousedown", (event) => {
    draggedItem = event.target;
})
svg.addEventListener("mouseup", (event) => {
    draggedItem = null;
})

document.addEventListener("keydown", (event) => {
    if(event.key == "Escape"){
        if(newLine != null){
            svg.removeChild(newLine);
        }
        sourceNode = newLine = null;
    }
});
