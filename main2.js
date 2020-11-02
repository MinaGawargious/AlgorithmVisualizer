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
let sourceNode = newLine = newWeightText = draggedItem = null;

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [lineObject]
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
        return [x2-dx, y2+dy, "black", "arrowheadBlack_Far", dx, dy]
    }
    return [x2, y2, "transparent", "arrowheadBlack_Near", 0, 0]
}

function updateLabelPosition(x1, y1, x2, y2, label){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dy = Math.sin(theta); 
    let dx = Math.cos(theta);
    if(y2 > y1){
        dx = -dx;
        dy = -dy;
    }
    let padding = 0.1;
    let labelWidth = label.getBBox().width, labelHeight = label.getBBox().height;
    let labelCenter = {"x": (x2+x1)/2 - dx*labelWidth*(0.5+padding), "y": (y2+y1)/2 - dy*labelHeight*(0.5 + padding)};
    setAttributes(label, {"x": labelCenter.x, "y": labelCenter.y, "text-anchor": "middle", "dominant-baseline": "middle"});
}

// TODO: MOVE LABELS.
// Used to shift when we create a double connection and when we drag. (x1, y1) is source point, (x2, y2) is end point.
function updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x1, y1, x2, y2){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dx = Math.cos(theta); 
    let dy = Math.sin(theta);
    if(y2 > y1){
        dx = -dx;
        dy = -dy;
    }
    
    let incomingX1 = x1 - w*dx, incomingY1 = y1 - w*dy;
    let [incomingX2, incomingY2, incomingArrowheadColor, incomingArrowhead, incomingXToTip, incomingYToTip] = getLineProperties(x1, y1, x2, y2);
    incomingX2 -= w*dx;
    incomingY2 -= w*dy;

    let outgoingX1 = x2 + w*dx, outgoingY1 = y2 + w*dy;
    let [outgoingX2, outgoingY2, outgoingArrowheadColor, outgoingArrowhead, outgoingXToTip, outgoingYToTip] = getLineProperties(x2, y2, x1, y1);
    outgoingX2 += w*dx;
    outgoingY2 += w*dy;

    setAttributes(incoming, {"x1": incomingX1, "y1": incomingY1, "x2": incomingX2, "y2": incomingY2, "stroke": incomingArrowheadColor, "marker-end": `url(#${incomingArrowhead})`});
    setAttributes(outgoing, {"x1": outgoingX1, "y1": outgoingY1, "x2": outgoingX2, "y2": outgoingY2, "stroke": outgoingArrowheadColor, "marker-end": `url(#${outgoingArrowhead})`}); 

    updateLabelPosition(incomingX1, incomingY1, incomingX2 + incomingXToTip, incomingY2 - incomingYToTip, incomingLabel);
    updateLabelPosition(outgoingX1, outgoingY1, outgoingX2 + outgoingXToTip, outgoingY2 - outgoingYToTip, outgoingLabel);
}

function updateSingleConnection(line, label, x1, y1, x2, y2){
    if(x1 != x2 || y1 != y2){ // Avoid 0/0.
        let [lineX2, lineY2, lineArrowheadColor, lineArrowhead] = getLineProperties(x1, y1, x2, y2);
        setAttributes(line, {"x1": x1, "y1": y1, "x2": lineX2, "y2": lineY2, "stroke": lineArrowheadColor, "marker-end": `url(#${lineArrowhead})`})

        updateLabelPosition(x1, y1, x2, y2, label);
    }
}

function updateAllLines(node){
    let x1 = node.cx.baseVal.value, y1 = node.cy.baseVal.value;
    // Incoming (override double connection below):
    for(let i = 0; i < Object.keys(adjacencyList).length; i++){
        if(adjacencyList[i].includes(node.id)){
            let incoming = lines[i][adjacencyList[i].indexOf(node.id)].lineObject;
            let label = lines[i][adjacencyList[i].indexOf(node.id)].label;
            let endNode = svg.getElementById(i);
            let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
            updateSingleConnection(incoming, label, x2, y2, x1, y1);
        }
    }
    
    for(let i = 0; i < adjacencyList[node.id].length; i++){
        let endNodeId = adjacencyList[node.id][i];
        let endNode = svg.getElementById(endNodeId);
        let outgoing = lines[node.id][i].lineObject;
        let outgoingLabel = lines[node.id][i].label;
        let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
        // Just outgoing edges.
        if(!adjacencyList[endNodeId].includes(node.id)){
            updateSingleConnection(outgoing, outgoingLabel, x1, y1, x2, y2);
        }else{ // Double connection
            let incoming = lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)].lineObject;
            let incomingLabel = lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)].label;
            updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x2, y2, x1, y1);
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

            newWeightText = document.createElementNS(svgns, "text");
            newWeightText.textContent = "1";
            setAttributes(newWeightText, {"x": node.cx.baseVal.value, "y": node.cy.baseVal.value, "class": "disableSelect"});
            svg.appendChild(newLine);  
            svg.appendChild(newWeightText);
        }else if(sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id)){ // Second node to establish connection.
            adjacencyList[sourceNode.id].push(node.id);
            lines[sourceNode.id].push({lineObject: newLine, label: newWeightText});

            if(adjacencyList[node.id].includes(sourceNode.id)){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index].lineObject; // newLine is incoming.
                let outgoingLabel = lines[node.id][index].label;
                updateDoubleConnection(newLine, outgoing, newWeightText, outgoingLabel, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            }else{
                updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            }
            newLine = sourceNode = newWeightText = null;
        }
    });
});

svg.addEventListener("mousemove", (event) => {
    event.preventDefault();
    if(newLine != null){
        updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, event.offsetX, event.offsetY);
    }else if(draggedItem != null && draggedItem.tagName == "circle"){
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
        if(newWeightText != null){
            svg.removeChild(newWeightText);
        }
        sourceNode = newLine = newWeightText = null;
    }
});

// TODO: Allow weight editing.
// TODO_IF_TIME: Allow for deleted nodes (delete number 2 of 7, next number is 2, not 8).