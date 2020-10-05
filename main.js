// Initial stuff:      
let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");


function setAttributes(element, attributes){
    for (let key in attributes){
        element.setAttribute(key, attributes[key]);
    }
} 

w = 6
h = 4
colors = ["Black", "Blue"];
let defs = document.createElementNS(svgns, "defs");
for (color of colors){
    let arrowheadLine = document.createElementNS(svgns, "marker");
    setAttributes(arrowheadLine, {"id": `arrowhead${color}`, "markerWidth": w, "markerHeight": h, "refX": 0, "refY": h/2, "orient": "auto", "fill": color});
    let arrowhead = document.createElementNS(svgns, "polygon");
    arrowhead.setAttribute("points", `0 0, ${w} ${h/2}, 0 ${h}`);
    arrowheadLine.appendChild(arrowhead);   
    defs.appendChild(arrowheadLine);  
}
svg.appendChild(defs);


let x1, y1;
priorNode = null;
let newLine = null;
let numNodes = 0;
w = 2;
arrowScale = 3

let content = document.querySelector(".content");
let playBut = document.getElementsByClassName("playBut")[0];
let adjacencyList = {};
let lines = {};
let func = dijkstra;

playBut.addEventListener("click", () => {
    func();
})

function dijkstra() {
    for (let node in lines){
        for(let line of lines[node]){
            setAttributes(line, {"stroke": "blue", "marker-end": "url(#arrowheadBlue)"})
        }
    }
}

let algorithms = document.querySelectorAll(".dropdown li");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]]
    });
}

svg.addEventListener("mousemove", (event) => {
    if(newLine != null){
        x2 = event.offsetX;
        y2 = event.offsetY;
        setAttributes(newLine, {"x2": x2, "y2": y2});
    }
})

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", () => {
    let radius = window.innerWidth/30;
    let node = document.createElementNS(svgns, "circle");
    setAttributes(node, {"r" : radius, "cx" :  Math.random() * svg.width.baseVal.value, "cy": Math.random() * svg.height.baseVal.value, "fill": "pink", "style": "stroke:black;stroke-width:3", "id": numNodes})

    let center = [node.getAttribute("cx"), node.getAttribute("cy")];
    let newText = document.createElementNS(svgns, "text");
    setAttributes(newText, {"pointer-events": "none", "text-anchor": "middle", "x": center[0], "y": center[1]});
    newText.textContent = numNodes;
    adjacencyList[numNodes] = []
    lines[numNodes++] = []
    svg.appendChild(node);
    svg.appendChild(newText);
    
    node.addEventListener("click", (event) => {
        console.log("Node clicked");
        if(priorNode == null){ // First node.
            x1 = node.getAttribute("cx");
            y1 = node.getAttribute("cy");
            newLine = document.createElementNS(svgns, "line");
            setAttributes(newLine, {"x1": x1, "y1": y1, "x2": x1, "y2": y1, "style": "stroke-width:4",  "marker-end": "url(#arrowheadBlack)", "pointer-events": "none", "stroke": "black"});
            svg.appendChild(newLine);
            priorNode = node;
        }else if ((x1 != center[0] || y1 != center[1]) && !adjacencyList[priorNode.id].includes(node.id)) { // Second node to establish connection.

            adjacencyList[priorNode.id].push(node.id);
            // If nodes already have an edge connecting them the other way, adjust positions:
            if(adjacencyList[node.id].includes(priorNode.id)){
                // Outgoing edge already exists. Incoming being created.
                let shift = 20;
                if(x1 < center[0]){ 
                    shift = 20;
                }
                let index = adjacencyList[node.id].indexOf(`${priorNode.id}`);
                let outgoing = lines[node.id][index];
                setAttributes(outgoing, {"y1": outgoing.getAttribute("y1") + shift, "y2": outgoing.getAttribute("y2") + shift});
                setAttributes(newLine, {"y1": y1 - shift, "x2" : center[0], "y2" : center[1] - shift});
            }else{
                setAttributes(newLine, {"x2" : center[0], "y2" : center[1]});
            }
            lines[priorNode.id].push(newLine);
            newLine = null;
            priorNode = null;
        }
    });
});
// TODO: Make arrow pairs side by side.
// TODO: Change centering and numbering of elements to account for deleted items (delete number 2 of 7, next number is 2, not 8). Also put line behind node.

// Don't do animation.