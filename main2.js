let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
}

textColor = "white";
let numNodes = 0;
let sourceNode = newLine = newWeightText = draggedItem = null;
let selectedRect = document.createElementNS(svgns, "rect");
setAttributes(selectedRect, {"fill": "none", "stroke": "blue"});
let selected = null;
let weighted = true, directed = true;

let adjacencyList = {}; // startID: [endIds]
let lines = {}; // startID: [lineObject, label]
let func = DFS;
let code = document.getElementById("DFSCode");
let startNode = null;

let algorithms = document.querySelectorAll(".algorithm");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]];
        code = document.getElementById(func.name+"Code")
        setWeighted(algorithm.getAttribute("weighted") == "true");
        setDirected(algorithm.getAttribute("directed") == "true");
        console.log(algorithm);
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

started = false;

btn = document.getElementsByClassName("btn")[0];
btn.onclick = (event) => {
    event.preventDefault();
    if(btn.classList.contains("play")) {
        btn.classList.remove("play");
        btn.classList.add("pause");
        if(!started){
            func(startNode);
            execute();
        }
        started = true;
    } else{
        btn.classList.remove("pause");
        btn.classList.add("play");
    }
};

function isNumber(evt) {
    var charCode = evt.keyCode;
    return ( (charCode <= 31) || (charCode >= 48 && charCode <= 57) )
}
form = document.getElementsByTagName("form")[0];
start = form.getElementsByTagName("input")[0];
form.onpaste = event => event.preventDefault();

form.onsubmit = (event) => {
    event.preventDefault();
    if(start.value < numNodes){
        startNode.classList.remove("startNode");
        let newStart = document.getElementById(parseInt(start.value));
        newStart.classList.add("startNode");
        startNode = newStart;
    }
}

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

// Used to shift when we create a double connection and when we drag. (x1, y1) is source point, (x2, y2) is end point.
function updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x1, y1, x2, y2, id1, id2){
    let theta = Math.atan((x2-x1)/(y1-y2));
    let dx = Math.cos(theta);
    let dy = Math.sin(theta);
    if(y2 > y1){
        dx = -dx;
        dy = -dy;
    }
    if(directed){
        let [incomingX2, incomingY2, incomingArrowheadColor, incomingArrowhead] = getLineProperties(x1, y1, x2, y2);
        let [outgoingX2, outgoingY2, outgoingArrowheadColor, outgoingArrowhead] = getLineProperties(x2, y2, x1, y1);

        setAttributes(incoming, {"x1": x1 - w*dx, "y1": y1 - w*dy, "x2": incomingX2 - w*dx, "y2": incomingY2 - w*dy, "stroke": incomingArrowheadColor, "marker-end": `url(#${incomingArrowhead})`});
        setAttributes(outgoing, {"x1": x2 + w*dx, "y1": y2 + w*dy, "x2": outgoingX2 + w*dx, "y2": outgoingY2 + w*dy, "stroke": outgoingArrowheadColor, "marker-end": `url(#${outgoingArrowhead})`});

        setAttributes(incomingLabel, {"pointer-events": "auto", "opacity": 1});
        setAttributes(outgoingLabel, {"pointer-events": "auto", "opacity": 1});
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
        setAttributes(line, {"x1": x1, "y1": y1, "x2": directed ? lineX2: x2, "y2": directed ? lineY2: y2, "stroke": directed ? lineArrowheadColor : "black"});
        if(directed){
            setAttributes(line, {"marker-end": `url(#${lineArrowhead})`});
        }else{
            line.removeAttribute("marker-end");
        }
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
            updateDoubleConnection(incoming, outgoing, incomingLabel, outgoingLabel, x2, y2, x1, y1, endNodeId, node.id);
        }
    }  
}

function makeWeightsVisible(){
    for(let i in lines){
        for(let j in lines[i]){
            setAttributes(lines[i][j].label, {"pointer-events": "auto", "opacity": 1});
        }
    }
}

function makeWeightsInvisible(){
    for(let i in lines){
        for(let j in lines[i]){
            setAttributes(lines[i][j].label, {"pointer-events": "none", "opacity": 0});
        }
    }
    if(newWeightText != null){
        setAttributes(newWeightText, {"pointer-events": "none", "opacity": 0});
    }
}

function setWeighted(newWeight){
    if(weighted != newWeight){
        weighted = newWeight;
        if(weighted){
            // addAllWeights();
            makeWeightsVisible();
        }else{
            // removeAllWeights();
            makeWeightsInvisible();
        }
        console.log((weighted ? "" : "un") + "weighted");
    }
}

function setDirected(newDirected){
    if(directed != newDirected){
        console.log("CHANGING")
        directed = newDirected;
        for(let node of svg.getElementsByTagNameNS(svgns, "circle")){
            updateAllLines(node);
        }
        console.log((directed ? "" : "un") + "directed");
    }
}

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", (event) => {
    // Create new node.
    let radius = window.innerWidth/30;
    let group = document.createElementNS(svgns, "g");
    let node = document.createElementNS(svgns, "circle");
    setAttributes(node, {"r" : radius, "cx" :  Math.random() * window.getComputedStyle(svg,null).getPropertyValue("width").slice(0, -2), "cy": Math.random() * window.getComputedStyle(svg,null).getPropertyValue("height").slice(0, -2), "style": "stroke-width:4", "id": numNodes});
    node.classList.add("node");
    if(numNodes == 0){
        node.classList.add("startNode");
        startNode = node;
    }

    let newText = document.createElementNS(svgns, "text");
    setAttributes(newText, {"text-anchor": "middle", "x": parseFloat(node.cx.baseVal.value)-0.5, "y": parseFloat(node.cy.baseVal.value)+4, "font-weight": "bold", "font-size": "16", "fill": textColor, "class": "disableSelect"});
    newText.textContent = numNodes;
    adjacencyList[numNodes] = []
    lines[numNodes++] = []
    group.appendChild(node);
    group.appendChild(newText);
    svg.appendChild(group);

    group.addEventListener("click", (event) => {
        if(sourceNode == null){
            sourceNode = node;
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": node.cx.baseVal.value, "y1": node.cy.baseVal.value, "x2": node.cx.baseVal.value, "y2": node.cy.baseVal.value, "style": "stroke-width:4", "pointer-events": "none", "stroke": "black"});
            if(directed){
                setAttributes(newLine, {"marker-end": "url(#arrowheadBlack_Near)"});
            }

            newWeightText = document.createElementNS(svgns, "text");
            newWeightText.textContent = "1";
            newWeightText.addEventListener("click", (event) => {
                selected = event.target; // We can reference newWeightText when setting fields upon creation because it's not null then. Upon click, however, it is null, so to reference this unique text field again, use event.target.
                console.log(selected)
                selected.textContent += "|";
              
                setAttributes(selectedRect, {"x": parseFloat(selected.getAttribute("x")) - selected.getBBox().width/2, "y": parseFloat(selected.getAttribute("y")) - selected.getBBox().height/2, "width": selected.getBBox().width, "height": selected.getBBox().height});
                svg.appendChild(selectedRect);
                editLabel(selected);
            })

            // LABELS MUST BE IN MEMORY AT ALL TIMES IN ORDER TO RESTORE AT CORRECT SPOT AND WEIGHTS WHEN GOING TO A WEIGHTED ALGORITHM.
            setAttributes(newWeightText, {"x": node.cx.baseVal.value, "y": node.cy.baseVal.value});
            svg.appendChild(newLine); 
            // There are two ways to add weight options. The first: remove labels from the HTML entirely. The second: simply make them invisible by setting opacity to 0. The first option also requires looping through all nodes as well to adjust label positions, and proved to be MUCH slower in dense graphs. So, the opacity option is better.
            // if(weighted){
            svg.appendChild(newWeightText);
            // }
            if(!weighted){
                setAttributes(newWeightText, {"pointer-events": "none", "opacity": 0});
            }
        }else if(sourceNode != node && !adjacencyList[sourceNode.id].includes(node.id) && (directed || !adjacencyList[node.id].includes(sourceNode.id))){ // Second node to establish connection. Make sure we don't make an edge to ourselves or a duplicate edge. Also only allow edge in undirected graph if no edge between these two nodes exists.
            adjacencyList[sourceNode.id].push(node.id);
            lines[sourceNode.id].push({lineObject: newLine, label: newWeightText});
            setAttributes(newWeightText, {"node1": sourceNode.id, "node2": node.id});

            if(adjacencyList[node.id].includes(sourceNode.id) && directed){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${sourceNode.id}`);
                let outgoing = lines[node.id][index].lineObject; // newLine is incoming.
                let outgoingLabel = lines[node.id][index].label;
                updateDoubleConnection(newLine, outgoing, newWeightText, outgoingLabel, sourceNode.cx.baseVal.value, sourceNode.cy.baseVal.value, node.cx.baseVal.value, node.cy.baseVal.value, sourceNode.id, node.id);
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

function doneEditing(){
    if(svg.contains(selectedRect)){
        svg.removeChild(selectedRect);
    }
    if(selected != null){
        selected.textContent = selected.textContent.replace('|', '');
        if(selected.textContent.length == 0){
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
})
svg.addEventListener("mouseup", (event) => {
    draggedItem = null;
})

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
        for (let element of [newLine, newWeightText]){
            if(element != null && svg.contains(element)){
                svg.removeChild(element);
            }
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
        }else if(isFinite(event.key) && selected.textContent.length < 6){ // 0 - 9
            selected.textContent = selected.textContent.slice(0, cursorIndex) + event.key + selected.textContent.slice(cursorIndex);
            editLabel(selected);
        }
    }
});


let baseWait = 2000;
let speed = 2;

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


function BFS(){

}

// Unweighted. Directed or undirected. Focus on directed only for now, and we can add the option for an algorithm to be either directed or undirected later.
// let adjacencyList = {}; // startID: [endIds]
// let lines = {}; // startID: [lineObject, label]

let steps = []; // {elements: [], actions: [], classList: []}
let discovered = [];



//TODO: codetrace indices.
// Step-based with codetrace:
async function DFS(node){
    // Initially, all nodes & edges undiscovered.
    // Highlight node as current:
    steps.push({"elements": [node, node, node], "actions": ["add", "add", "remove"], "classList": ["discoveredNode", "currentNode", "goingTo"], "index": 0});

    discovered.push(node.id);
    // Loop through the edges:
    for(let i in adjacencyList[node.id]){
        let edge = lines[node.id][i].lineObject;

        // Dehighlight node, highlight current edge.
        steps.push({"elements": [node, edge, edge], "actions": ["remove", "add", "add"], "classList": ["currentNode", "discoveredEdge", "currentEdge"], "index": 1});

        // Go on to neighbor node:
        let neighbor = document.getElementById(adjacencyList[node.id][i]);
        if(!discovered.includes(neighbor.id)){
            steps.push({"elements": [edge, neighbor], "actions": ["remove", "add"], "classList": ["currentEdge", "goingTo"], "index": 2});
            await DFS(neighbor);
            steps[steps.length-1] = {"elements": [neighbor, neighbor, node], "actions": ["remove", "add", "add"], "classList": ["currentNode", "finishedNode", "currentNode"], "index": 4}; // Override prior entry to make node current.
        }else{
            // Node already discovered, so this edge will not actually be explored.
            steps.push({"elements": [edge, node], "actions": ["remove", "add"], "classList": ["currentEdge", "currentNode"], "index": 3});
        }
    }
   
    // Node finished:
    steps.push({"elements": [node, node], "actions": ["remove", "add"], "classList": ["currentNode", "finishedNode"], "index": 4});  // If node is startNode, this will not be overridden. Mark node as finished.
    return Promise.resolve();
}

async function execute(){
    for(let i = 0; i < steps.length; i++){
        code.getElementsByTagName("p")[steps[i]["index"]].setAttribute("style", "color:green;");
        code.getElementsByTagName("p")[steps[i]["index"]].setAttribute("text-decoration", "underline;");
        for(let j = 0; j < steps[i]["elements"].length; j++){
            if(steps[i]["actions"][j] == "add"){
                steps[i]["elements"][j].classList.add(steps[i]["classList"][j]);
            }else{
                steps[i]["elements"][j].classList.remove(steps[i]["classList"][j]);
            }
        }
        await sleep(baseWait/speed);
        if(btn.classList.contains("play")){
            await waitListener(btn,"click");
        }
        code.getElementsByTagName("p")[steps[i]["index"]].removeAttribute("style");
        code.getElementsByTagName("p")[steps[i]["index"]].removeAttribute("text-decoration");
    }
}

function Dijkstra(){

}

function Bellman_Ford(){

}

// TODO: Types of edges/nodes:
    //  Undiscovered (no change needed).
    //  Discovered
    //  Current
// Additional for node:
    //  Finished
// Upon hover:
    // Show path.
// Possible clean up with classes and objects instead of functions so as to have object property for visited, current...


// Switch/clear: Reset discovered list. Reset node and edge colors to orange and black, respectively.


// We can display where we are in code with method 1. However, it is hard to scrub through (especially backwards. we can probably run DFS first to get numSteps, then have a count variable incremented each step to scrub forwards, but backwards is impossible).
// We can  allow for scrubbing through specific steps with method 2. With extra data, we can display where we are.
