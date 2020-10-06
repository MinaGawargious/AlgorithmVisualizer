let svgns = "http://www.w3.org/2000/svg";
let svg = document.querySelector("svg");

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


let x1, y1;
priorNode = null;
let newLine = null;
let numNodes = 0;
currentGradient = document.createElementNS(svgns, "linearGradient");
let stop1Current = document.createElementNS(svgns, "stop");
let stop2Current = document.createElementNS(svgns, "stop");

let playBut = document.getElementsByClassName("playBut")[0];
let adjacencyList = {};
let lines = {};
let func = dijkstra;

playBut.addEventListener("click", () => {
    func();
})

function dijkstra() {
    // for (let node in lines){
    //     for(let line of lines[node]){
    //         // setAttributes(line, {"stroke": "blue", "marker-end": "url(#arrowheadBlue)"})
    //     }
    // }
}

let algorithms = document.querySelectorAll(".dropdown li");
for(let algorithm of algorithms){
    algorithm.addEventListener("click", () => {
        func = window[algorithm.classList[0]]
    });
}

svg.addEventListener("mousemove", (event) => {
    if(newLine != null){
        let x2 = event.offsetX;
        let y2 = event.offsetY;
        setAttributes(newLine, {"x2": x2, "y2": y2});
        let theta = Math.atan((y2-y1)/(x1-x2)); 
        let dx = (w/2) * Math.cos(theta);
        let dy = (w/2) * Math.sin(theta);
        if(y1 > y2){ 
            dx = -dx
            dy = -dy;
        }
        // console.log("Theta = " + theta * 180/Math.PI, "dx = " + dx, "dy = " + -dy);
        if(svg.contains(currentGradient)){
            svg.removeChild(currentGradient);
        }
        let distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
        setAttributes(currentGradient, {"id": `${x2}${y2}`})
        let numerator = distance-3*w;
        let color1 = "black", color2 = "transparent";
        if(x2 < x1){
            numerator = 3*w;
            color1 = "transparent", color2 = "black";
        }
        setAttributes(stop1Current, {"offset":`${numerator*100/distance}%`, "stop-color": color1});
        setAttributes(stop2Current, {"offset":`${numerator*100/distance}%`, "stop-color": color2});
        currentGradient.append(stop1Current, stop2Current);
        svg.appendChild(currentGradient);
        newLine.setAttribute("stroke", `url(#${x2}${y2})`);
    }
})

let addButton = document.getElementsByClassName("add")[0];
addButton.addEventListener("click", () => {
    let radius = window.innerWidth/30;
    let node = document.createElementNS(svgns, "circle");
    setAttributes(node, {"r" : radius, "cx" :  Math.random() * svg.width.baseVal.value, "cy": Math.random() * svg.height.baseVal.value, "fill": "pink", "style": "stroke:#2196f3;stroke-width:3", "id": numNodes})

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
            let theta = Math.atan((center[1]-y1)/(x1-center[0]));
            console.log(theta * 180/Math.PI);
            console.log(theta);
            let dy = (w/2) * Math.cos(theta);
            let dx = (w/2) * Math.sin(theta);
            if(y1 > center[1]){ 
                dx = -dx
                dy = -dy;
            }
            // If nodes already have an edge connecting them the other way, adjust positions:
            if(adjacencyList[node.id].includes(priorNode.id)){ // Outgoing edge already exists. Incoming being created.
                let index = adjacencyList[node.id].indexOf(`${priorNode.id}`);
                let outgoing = lines[node.id][index].lineObject;
                console.log(outgoing.getAttribute("y1"));

                setAttributes(outgoing, {"x1": parseFloat(center[0]) + dx, "y1": parseFloat(center[1]) + dy, "x2": parseFloat(x1) + dx, "y2": parseFloat(y1) + dy});
                setAttributes(newLine, {"x1": parseFloat(x1) - dx, "y1": parseFloat(y1) - dy, "x2" : parseFloat(center[0]) - dx, "y2" : parseFloat(center[1]) - dy, "stroke": "orange"});
            }else{
                setAttributes(newLine, {"x2" : parseFloat(center[0]), "y2" : parseFloat(center[1])});
            }

            let gradient = document.createElementNS(svgns, "linearGradient");
            let stop1 = document.createElementNS(svgns, "stop");
            let stop2 = document.createElementNS(svgns, "stop");

            setAttributes(gradient, {"id": `${priorNode.id}_${node.id}`})
            setAttributes(stop1, {"offset":`${stop1Current.getAttribute("offset")}`, "stop-color": stop1Current.getAttribute("stop-color")});
            setAttributes(stop2, {"offset":`${stop2Current.getAttribute("offset")}`, "stop-color": stop2Current.getAttribute("stop-color")});
            gradient.append(stop1, stop2);
            svg.appendChild(gradient);
            svg.removeChild(currentGradient);
            newLine.setAttribute("stroke", `url(#${priorNode.id}_${node.id})`);
            lines[priorNode.id].push({lineObject: newLine, end: node.id, gradient: currentGradient});
            newLine = null;
            priorNode = null;
        }
    });
});

// TODO: Add weights and orient label correctly.
// TODO: Upon running, make transparent gradient for blue.
// TODO: Allow node movement (click and drag).
// TODO: Allow for deleted nodes (delete number 2 of 7, next number is 2, not 8). 

// Don't do animation.