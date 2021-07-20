let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
}

let numNodes = 0;
let sourceNode = newLine = newWeightText = draggedItem = null;
let selectedRect = document.createElementNS(svgns, "rect");
setAttributes(selectedRect, {"fill": "none", "stroke": "blue"});
let selected = null;
let weighted = false, directed = true;

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [lineObject, label]
let func = BFS;
let code = document.getElementById(`${func.name}Code`);
let codeParagraphs = code.getElementsByTagName("p");
let current = document.getElementById("current");
let startNode = null;

let steps = []; // {elements: [], actions: [], classList: [], print: String, clearCurrent: Bool}
let discovered = [];

let algorithms = document.querySelectorAll(".algorithm");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        code.classList.add("invisible");
        steps = [];
        discovered = [];
        func = window[algorithm.classList[0]];
        code = document.getElementById(func.name+"Code");
        code.classList.remove("invisible");
        codeParagraphs = code.getElementsByTagName("p");
        setWeightedAndDirected(algorithm.getAttribute("weighted") == "true", algorithm.getAttribute("directed") == "true");
        console.log(algorithm);
    });
}

let h = 6, w = 4;
let defs = document.createElementNS(svgns, "defs");

for (let color of ["Black"]){
    for (let distance of ["Near", "Far"]){
        let arrowheadMarker = document.createElementNS(svgns, "marker");
        setAttributes(arrowheadMarker, {"id": `arrowhead${color}_${distance}`, "markerWidth": h, "markerHeight": w, "refX": distance == "Far" ? 0 : h, "refY": w/2, "orient": "auto", "fill": color});
        let arrowhead = document.createElementNS(svgns, "polygon");
        arrowhead.setAttribute("points", `0 0, ${h} ${w/2}, 0 ${w}`);
        arrowheadMarker.appendChild(arrowhead);
        defs.appendChild(arrowheadMarker); 
    }
}
svg.appendChild(defs);

let started = false;
let stepSlider = document.getElementById("stepSlider");

playPause = document.getElementsByClassName("playPause")[0];
playPause.onclick = (event) => {
    event.preventDefault();
    if(playPause.classList.contains("play")) { // Currently paused. Now play.
        playPause.classList.remove("play");
        if(!started){
            started = true;
            func(startNode);
            execute();
        }
        console.log("setting max to ", steps.length);
        stepSlider.setAttribute("max", steps.length);
        stepSlider.classList.remove("disableSelect", "disableElement");
    } else{ // Currently playing. Now pause.
        playPause.classList.add("play");
    }
};

function isNumber(evt) {
    var charCode = evt.keyCode;
    return ( (charCode <= 31) || (charCode >= 48 && charCode <= 57) );
}

form = document.getElementsByTagName("form")[0];
start = form.getElementsByTagName("input")[0];
form.onpaste = event => event.preventDefault();
form.onsubmit = (event) => {
    event.preventDefault();
    if(start.value < numNodes && start.value != startNode.id){
        startNode.classList.remove("startNode");
        startNode = svg.getElementById(parseInt(start.value));
        startNode.classList.add("startNode");
    }
}

// Returns stroke, arrowhead, and end coordinates.
function getLineProperties(x1, y1, x2, y2){
    let distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    if(distance > 4*h){
        let theta = Math.atan((x2-x1)/(y1-y2));
        let dx = (y2 > y1) ? -4*h*Math.sin(theta) : 4*h*Math.sin(theta); // The 4 is from the stroke width.
        let dy = (y2 > y1) ? -4*h*Math.cos(theta) : 4*h*Math.cos(theta);
        return [x2-dx, y2+dy, "black", "arrowheadBlack_Far"];
    }
    return [x2, y2, "transparent", "arrowheadBlack_Near"];
}

function updateLabelPosition(x1, y1, x2, y2, label){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dy = (y2 > y1) ? -Math.sin(theta) : Math.sin(theta);
    let dx = (y2 > y1) ? -Math.cos(theta) : Math.cos(theta);
    let padding = 0.1;
    let labelWidth = label.getBBox().width, labelHeight = label.getBBox().height;
    let labelCenter = {"x": (x2+x1)/2 - dx*labelWidth*(0.5+padding), "y": (y2+y1)/2 - dy*labelHeight*(0.5 + padding)};
    setAttributes(label, {"x": labelCenter.x, "y": labelCenter.y, "text-anchor": "middle", "dominant-baseline": "middle"});
}

// Used to shift when we create a double connection and when we drag. (x1, y1) is source point, (x2, y2) is end point.
function updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x1, y1, x2, y2, id1, id2){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dx = (y2 > y1) ? -Math.cos(theta) : Math.cos(theta);
    let dy = (y2 > y1) ? -Math.sin(theta) : Math.sin(theta);
    if(directed){
        let [incomingX2, incomingY2, incomingArrowheadColor, incomingArrowhead] = getLineProperties(x1, y1, x2, y2);
        let [outgoingX2, outgoingY2, outgoingArrowheadColor, outgoingArrowhead] = getLineProperties(x2, y2, x1, y1);

        setAttributes(incoming, {"x1": x1 - w*dx, "y1": y1 - w*dy, "x2": incomingX2 - w*dx, "y2": incomingY2 - w*dy, "stroke": incomingArrowheadColor, "marker-end": `url(#${incomingArrowhead})`});
        setAttributes(outgoing, {"x1": x2 + w*dx, "y1": y2 + w*dy, "x2": outgoingX2 + w*dx, "y2": outgoingY2 + w*dy, "stroke": outgoingArrowheadColor, "marker-end": `url(#${outgoingArrowhead})`});
        setAttributes(incomingLabel, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
        setAttributes(outgoingLabel, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
    }else{
        setAttributes(incoming, {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "stroke": "black"});
        setAttributes(outgoing, {"x1": x2, "y1": y2, "x2": x1, "y2": y1, "stroke": "black"});
        incoming.removeAttribute("marker-end");
        outgoing.removeAttribute("marker-end");
        let labelToRemove = id1 < id2 ? incomingLabel : outgoingLabel;
        setAttributes(labelToRemove, {"pointer-events": "none", "opacity": 0});
    }

    updateLabelPosition(x1 - w*dx, y1 - w*dy, x2 - w*dx, y2 - w*dy, incomingLabel);
    updateLabelPosition(x2 + w*dx, y2 + w*dy, x1 + w*dx, y1 + w*dy, outgoingLabel);
}

function updateSingleConnection(line, label, x1, y1, x2, y2){
    if(x1 != x2 || y1 != y2){ // Avoid 0/0.
        let [lineX2, lineY2, lineArrowheadColor, lineArrowhead] = getLineProperties(x1, y1, x2, y2);
        setAttributes(line, {"x1": x1, "y1": y1, "x2": directed ? lineX2 : x2, "y2": directed ? lineY2 : y2, "stroke": directed ? lineArrowheadColor : "black"});
        directed ? setAttributes(line, {"marker-end": `url(#${lineArrowhead})`}) : line.removeAttribute("marker-end");
        updateLabelPosition(x1, y1, x2, y2, label);
    }
}

function updateAllLines(node){
    let x1 = node.cx.baseVal.value, y1 = node.cy.baseVal.value;
    // Incoming (override double connection below):
    for(let i = 0; i < Object.keys(adjacencyList).length; i++){
        if(adjacencyList[i].includes(node.id)){
            let incoming = lines[i][adjacencyList[i].indexOf(node.id)];
            let endNode = svg.getElementById(i);
            let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
            updateSingleConnection(incoming.lineObject, incoming.label, x2, y2, x1, y1);
        }
    }

    for(let i = 0; i < adjacencyList[node.id].length; i++){
        let endNodeId = adjacencyList[node.id][i];
        let endNode = svg.getElementById(endNodeId);
        let outgoing = lines[node.id][i];
        let x2 = endNode.cx.baseVal.value, y2 = endNode.cy.baseVal.value;
        
        if(!adjacencyList[endNodeId].includes(node.id)){ // Just outgoing edges.
            updateSingleConnection(outgoing.lineObject, outgoing.label, x1, y1, x2, y2);
        }else{ // Double connection
            let incoming = lines[endNodeId][adjacencyList[endNodeId].indexOf(node.id)];
            updateDoubleConnection(incoming.lineObject, outgoing.lineObject, incoming.label, outgoing.label, x2, y2, x1, y1, endNodeId, node.id);
        }
    }
}

function setWeightedAndDirected(newWeight, newDirected){
    if(weighted != newWeight){
        weighted = newWeight;
        for(let i in lines){
            for(let j in lines[i]){
                setAttributes(lines[i][j].label, {"pointer-events": weighted ? "auto" : "none", "opacity": weighted ? 1 : 0});
            }
        }
        if(!weighted && newWeightText != null){
            setAttributes(newWeightText, {"pointer-events": "none", "opacity": 0});
        }
        console.log("CHANGING TO " + (weighted ? "" : "un") + "weighted");
    }

    if(directed != newDirected){
        directed = newDirected;
        for(let node of svg.getElementsByTagNameNS(svgns, "circle")){
            updateAllLines(node);
        }
        console.log("CHANGING TO " + (directed ? "" : "un") + "directed");
    }
}

function createNewNode(){
    let radius = window.innerWidth/30;
    let nodeTextGroup = document.createElementNS(svgns, "g");
    let node = document.createElementNS(svgns, "circle");

    setAttributes(node, {"r": radius, "cx": Math.random() * window.getComputedStyle(svg,null).getPropertyValue("width").slice(0, -2), "cy": Math.random() * window.getComputedStyle(svg,null).getPropertyValue("height").slice(0, -2), "style": "stroke-width:4", "id": numNodes});
    node.classList.add("node");
    if(numNodes == 0){
        node.classList.add("startNode");
        startNode = node;
    }

    let newText = document.createElementNS(svgns, "text");
    setAttributes(newText, {"text-anchor": "middle", "x": parseFloat(node.cx.baseVal.value)-0.5, "y": parseFloat(node.cy.baseVal.value)+4, "font-weight": "bold", "font-size": "16", "class": "disableSelect nodeText"});
    newText.textContent = numNodes;
    adjacencyList[numNodes] = [];
    lines[numNodes++] = [];
    nodeTextGroup.append(node, newText);
    svg.appendChild(nodeTextGroup);

    nodeTextGroup.addEventListener("click", (event) => {
        if(sourceNode == null){
            sourceNode = node;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": node.cx.baseVal.value, "y1": node.cy.baseVal.value, "x2": node.cx.baseVal.value, "y2": node.cy.baseVal.value, "style": "stroke-width:4", "pointer-events": "none", "stroke": "black", "marker-end": directed ? "url(#arrowheadBlack_Near)" : "none"});

            newWeightText = document.createElementNS(svgns, "text");
            newWeightText.textContent = "1";
            newWeightText.addEventListener("click", (event) => {
                selected = event.target; // We can reference newWeightText when setting fields upon creation because it's not null then. But upon click, it is null, so to reference this unique text field again, use event.target.
                console.log(selected);
                selected.textContent += "|";
              
                setAttributes(selectedRect, {"x": parseFloat(selected.getAttribute("x")) - selected.getBBox().width/2, "y": parseFloat(selected.getAttribute("y")) - selected.getBBox().height/2, "width": selected.getBBox().width, "height": selected.getBBox().height});
                svg.appendChild(selectedRect);
                editLabel(selected);
            });

            // LABELS MUST BE IN MEMORY AT ALL TIMES IN ORDER TO RESTORE AT CORRECT SPOT AND WEIGHTS WHEN GOING TO A WEIGHTED ALGORITHM.
            setAttributes(newWeightText, {"x": node.cx.baseVal.value, "y": node.cy.baseVal.value, "pointer-events": (weighted ? "auto" : "none"), "opacity": weighted ? 1 : 0}); // Instead of removing labels from DOM for unweighted (slow), make them invisible and unclickable.
            let lineWeightGroup = document.createElementNS(svgns, "g");
            lineWeightGroup.append(newLine, newWeightText);
            svg.appendChild(lineWeightGroup);
        }else if(sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id) && (directed || !adjacencyList[node.id].includes(sourceNode.id))){ // Second node to establish connection. Make sure we don't make an edge to ourselves or a duplicate edge. Also only allow edge in undirected graph if no edge between these two nodes exists.
            newLine.id = `edge${sourceNode.id}_${node.id}`;
            playPause.classList.remove("disableElement", "disableSelect");
            adjacencyList[sourceNode.id].push(node.id);
            lines[sourceNode.id].push({lineObject: newLine, label: newWeightText});
            setAttributes(newWeightText, {"node1": sourceNode.id, "node2": node.id});

            if(adjacencyList[node.id].includes(sourceNode.id) && directed){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index]; // newLine is incoming.
                updateDoubleConnection(newLine, outgoing.lineObject, newWeightText, outgoing.label, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, sourceNode.id, node.id);
            }else{
                updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value);
            }
            newLine = sourceNode = newWeightText = null;
        }
    });
    nodeTextGroup.addEventListener("mouseover", (event) => { // mouseenter?
        if(started && stepSlider.value == steps.length){ // Execution done.
            updateHighlight(true, node);
        }
    });
    nodeTextGroup.addEventListener("mouseleave", (event) => {
        if(started && stepSlider.value == steps.length){
            console.log("leaving ", node.id);
            updateHighlight(false, node);
        }
    });
}

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", (event) => {
    createNewNode();
});

// I may consider changing this for speed: have an array of length numNodes, with each node's parent id, DOM element, and edge element from parent to itself. 
// This avoids a document lookup at the expense of more memory used to store the DOM elements.
function updateHighlight(highlight, node){
    // console.log((highlight ? "H" : "Unh") + "ighlighting node ", node.id);
    // Highlight or unhighlight all nodes and edges from startNode to NODE.
    highlight ? node.classList.add("highlightedNode") : node.classList.remove("highlightedNode");
    if(node != startNode && node.hasAttribute("parent")){
        let parentID = node.getAttribute("parent");
        let incomingEdge = svg.getElementById(`edge${parentID}_${node.id}`);
        highlight ? incomingEdge.classList.add("highlightedEdge") : incomingEdge.classList.remove("highlightedEdge");
        let parentNode = svg.getElementById(parentID);
        updateHighlight(highlight, parentNode);
    }
}

svg.addEventListener("mousemove", (event) => {
    event.preventDefault();
    let X = event.offsetX;
    let Y = event.offsetY;
    if(newLine != null){
        updateSingleConnection(newLine, newWeightText, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, X, Y);
    }else if(draggedItem != null && draggedItem.tagName == "circle"){
        setAttributes(draggedItem, {"cx": X, "cy": Y});
        setAttributes(draggedItem.nextElementSibling, {"x": X-0.5, "y": Y+4});
        updateAllLines(draggedItem);
    }
});

function doneEditing(){
    if(svg.contains(selectedRect)){
        svg.removeChild(selectedRect);
    }
    if(selected != null){
        selected.textContent = parseInt(selected.textContent.replace('|', '')); // parseInt eliminates trailing 0s. Returns NaN for not-a-number, such as empty strings.
        if(isNaN(selected.textContent)){
            selected.textContent = "1";
        }
        editLabel(selected);
        selected = null;
    }
}

svg.addEventListener("mousedown", (event) => {
    if(event.target.tagName == "circle"){
        draggedItem = event.target;
    }
    doneEditing();
});
svg.addEventListener("mouseup", (event) => {
    draggedItem = null;
});

// Called when we edit a label's text to adjust the position.
function editLabel(label){
    let node1Id = label.getAttribute("node1");
    let node2Id = label.getAttribute("node2");
    let node1 = svg.getElementById(node1Id);
    let node2 = svg.getElementById(node2Id);

    let incomingEntry = lines[node1Id][adjacencyList[node1Id].indexOf(node2Id)];
    if(!adjacencyList[node2Id].includes(node1Id)){ // Single connection.
        updateSingleConnection(incomingEntry.lineObject, incomingEntry.label, node1.cx.baseVal.value, node1.cy.baseVal.value, node2.cx.baseVal.value, node2.cy.baseVal.value);
    }else{ // Double connection.
        let outgoingEntry = lines[node2Id][adjacencyList[node2Id].indexOf(node1Id)];
        updateDoubleConnection(outgoingEntry.lineObject, incomingEntry.lineObject, outgoingEntry.label, incomingEntry.label, node2.cx.baseVal.value, node2.cy.baseVal.value, node1.cx.baseVal.value, node1.cy.baseVal.value, node2Id, node1Id);
    }
    setAttributes(selectedRect, {"x": parseFloat(selected.getAttribute("x")) - selected.getBBox().width/2, "y": parseFloat(selected.getAttribute("y")) - selected.getBBox().height/2, "width": selected.getBBox().width, "height": selected.getBBox().height});
}

document.addEventListener("keydown", (event) => {
    if(event.key == "Escape" || event.key == "Enter"){
        if(newWeightText != null){
            svg.removeChild(newWeightText.parentElement);
        }
        doneEditing();
        sourceNode = newLine = newWeightText = null;
    }else if(selected != null){
        // SVG text do not allow editing like input fields do, so I have to mimic it myself with the pipe character as the cursor.
        let cursorIndex = selected.textContent.indexOf("|");
        if(event.key == "ArrowLeft" && cursorIndex != 0){ // Move left.
            selected.textContent = selected.textContent.replace("|","");
            selected.textContent = selected.textContent.slice(0, cursorIndex - 1) + "|" + selected.textContent.slice(cursorIndex-1);
        }else if(event.key == "ArrowRight" && cursorIndex != selected.textContent.length-1){
            selected.textContent = selected.textContent.replace("|","");
            selected.textContent = selected.textContent.slice(0, cursorIndex + 1) + "|" + selected.textContent.slice(cursorIndex+1);
        }else if(event.key == "Backspace" || event.key == "Delete" && cursorIndex > 0){
            selected.textContent = selected.textContent.slice(0, cursorIndex-1) + selected.textContent.slice(cursorIndex);
            editLabel(selected);
        }else if(isFinite(event.key) && event.key != " " && selected.textContent.length < 6){ // 0 - 9
            selected.textContent = selected.textContent.slice(0, cursorIndex) + event.key + selected.textContent.slice(cursorIndex);
            editLabel(selected);
        }
    }else if(event.key == "ArrowRight"){ // Step forward. Pause execution.
    }else if(event.key == "ArrowLeft"){ // Step back. Pause execution.
    }else if(event.key == " "){
        if(!playPause.classList.contains("disableElement")){
            playPause.click(); // execute() has event listener on click, so spacebar will simulate a click to trigger that event listener (vs. calling a function that won't trigger event listener).
        }
    }
});

function sleep(ms){
    return new Promise(r => setTimeout(r, ms));
}

function waitListener(Element, ListenerName) {
    return new Promise(function (resolve, reject) {
        var listener = event => {
            Element.removeEventListener(ListenerName, listener);
            resolve(event);
        };
        Element.addEventListener(ListenerName, listener);
    });
}

function BFS(node){
    let Q = [node.id];
    discovered = [node.id];
    steps.push({"elements": [node, node], "actions": ["add", "add"], "classList": ["discoveredNode", "currentNode"], "indices": [0, 1], "print": `BFS(${node.id}):\nInitialize Q = {${Q}}`, "clearCurrent": true});
    let priorNode = null;
    let currentNode = null;
    while(Q.length > 0){
        let currentNodeId = Q.shift();
        currentNode = svg.getElementById(currentNodeId);
        if(priorNode == null){
            steps.push({"elements": [currentNode, currentNode], "actions": ["add", "add"], "classList": ["discoveredNode", "currentNode"], "indices": [2, 3], "print": `Q = {${[currentNodeId].concat(Q)}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }else{
            steps.push({"elements": [currentNode, currentNode, priorNode, priorNode, priorNode], "actions": ["add", "add", "remove", "add", "remove"], "classList": ["discoveredNode", "currentNode", "currentNode", "finishedNode", "comingFrom"], "indices": [2, 3], "print": `Q = {${[currentNodeId].concat(Q)}} is not empty\nExploring neighbors of node v = ${currentNodeId}`, "clearCurrent": true});
        }

        for(let neighborId of adjacencyList[currentNodeId]){
            let edge = svg.getElementById(`edge${currentNodeId}_${neighborId}`);
            steps.push({"elements": [edge, edge, currentNode, currentNode], "actions": ["add", "add", "remove", "add"], "classList": ["discoveredEdge", "currentEdge", "currentNode", "comingFrom"], "indices": [4], "print": `Try edge ${currentNodeId} -> ${neighborId}`, "clearCurrent": true}); // Removing currentNode and adding comingFrom is redunant after first iteration.
            if(!discovered.includes(neighborId)){
                let neighbor = svg.getElementById(neighborId);
                neighbor.setAttribute("parent", currentNodeId);
                steps.push({"elements": [neighbor, edge], "actions": ["add", "remove"], "classList": ["discoveredNode", "currentEdge"], "indices": [5], "print": `Node ${neighborId} not discovered. Q.push(${neighborId})`, "clearCurrent": false});
                Q.push(neighborId);
                discovered.push(neighborId);
            }else{ // Ignore this node.
                steps.push({"elements": [edge], "actions": ["remove"], "classList": ["currentEdge"], "indices": [6], "print": `Node ${neighborId} already discovered. Skip it`, "clearCurrent": false});
            }
        }
        priorNode = currentNode;
    }
    steps.push({"elements": [currentNode, currentNode], "actions": ["remove", "add"], "classList": ["currentNode", "finishedNode"], "indices": [], "print": `BFS(${node.id}) Done`, "clearCurrent": true});
}

function DFS(node){
    // Highlight node as current:
    steps.push({"elements": [node, node, node], "actions": ["add", "add", "remove"], "classList": ["discoveredNode", "currentNode", "goingTo"], "indices": [0], "print": `DFS(${node.id})`, "clearCurrent": true});

    discovered.push(node.id);
    // Loop through the edges:
    for(let i in adjacencyList[node.id]){
        // Dehighlight node, highlight current edge.
        let edge = lines[node.id][i].lineObject;
        steps.push({"elements": [node, edge, edge], "actions": ["remove", "add", "add"], "classList": ["currentNode", "discoveredEdge", "currentEdge"], "indices": [1], "print": `Try edge ${node.id} -> ${adjacencyList[node.id][i]}`, "clearCurrent": true});

        // Go on to neighbor node:
        let neighborId = adjacencyList[node.id][i];
        if(!discovered.includes(neighborId)){
            let neighbor = svg.getElementById(neighborId);
            neighbor.setAttribute("parent", node.id);
            steps.push({"elements": [edge, neighbor], "actions": ["remove", "add"], "classList": ["currentEdge", "goingTo"], "indices": [2], "print": `Node ${neighborId} unvisited`, "clearCurrent": false});
            DFS(neighbor);
            steps[steps.length-1] = {"elements": [neighbor, neighbor, node], "actions": ["remove", "add", "add"], "classList": ["currentNode", "finishedNode", "currentNode"], "indices": [4], "print": `Done with DFS(${neighborId}). Back to DFS(${node.id})`, "clearCurrent": true}; // Override prior entry to make node current.
        }else{
            // Node already discovered, so this edge will not actually be explored.
            steps.push({"elements": [edge, node], "actions": ["remove", "add"], "classList": ["currentEdge", "currentNode"], "indices": [3], "print": `Node ${neighborId} already visited. Back to node ${node.id}`, "clearCurrent": true});
        }
    }
   
    // Node finished:
    steps.push({"elements": [node, node], "actions": ["remove", "add"], "classList": ["currentNode", "finishedNode"], "indices": [4], "print": `Done with DFS(${node.id})`, "clearCurrent": true});  // If node is startNode, this will not be overridden. Mark node as finished.
}

function doStep(step){
    if(step > 0){
        for(let index of steps[step-1]["indices"]){
            codeParagraphs[index].removeAttribute("style");
        }
    }
    
    if(steps[step]["clearCurrent"]){
        current.innerHTML = "";
    }
    let newCurrentText = document.createElement("p");
    newCurrentText.innerText = steps[step]["print"];
    current.appendChild(newCurrentText);

    for(let index of steps[step]["indices"]){
        codeParagraphs[index].setAttribute("style", "background:green;");
    }
    for(let j = 0; j < steps[step]["elements"].length; j++){
        let action = steps[step]["actions"][j];
        let element = steps[step]["elements"][j];
        let currentClass = steps[step]["classList"][j];
        action == "add" ? element.classList.add(currentClass) : element.classList.remove(currentClass);
    }
}

let oldValue = 0;
let baseWait = 2500;
let speedSlider = document.getElementById("speedSlider");

async function execute(){ // async is syntactic sugar to return the values as a resolved promise.
    while(stepSlider.value < steps.length){
        // Execute step at index stepSlider.value.
        doStep(stepSlider.value);
        stepSlider.value++;
        // console.log("Going from ", oldValue, "to ", stepSlider.value);
        oldValue = parseInt(stepSlider.value);
        await sleep(baseWait/speedSlider.value); // await pauses execution until the promise is resolved.
        if(playPause.classList.contains("play")){
            await waitListener(playPause,"click");
        }
        console.log("waitListener done. stepSlider.value = ", stepSlider.value);
    }
    playPause.classList.add("play");
}

stepSlider.oninput = (event) => {
    console.log(oldValue, stepSlider.value);
    let max = parseInt(stepSlider.value);
    while(oldValue < max){
        console.log("oldValue = ", oldValue, " and stepSlider.value = ", stepSlider.value);
        doStep(oldValue);
        oldValue++;
    }
}

function Dijkstra(){}

function Bellman_Ford(){}
