window.arch = {};

// TODO 3rd level of nesting: libraries
// might want record based nodes for libs

arch.expandedGroups = {};

arch.buildGraph = function(system, expandedGroups) {
    // Deep clone system so this doesn't modify original
    system = JSON.parse(JSON.stringify(system));


    var groupByHiddenSvc = {};
    for (var i = 0; i < system.length; i++) {
        var svc = system[i];
        if (!expandedGroups[svc.group]) { // collapsed / zoomed out
            groupByHiddenSvc[svc.name] = svc.group;
        }
    }
    console.log(groupByHiddenSvc);

    // Update link dests
    system.forEach(function(svc) {
        var newConnectsTo = {};
        svc.connectsTo.forEach(function(dst) {
            var newTarget = groupByHiddenSvc[dst];
            if (newTarget) {
                newConnectsTo[newTarget] = true;
            } else {
                newConnectsTo[dst] = true;
            }
        });
        svc.connectsTo = Object.keys(newConnectsTo);
    });
    console.log(system);

    var graph = {};
    for (var i = 0; i < system.length; i++) {
        var svc = system[i];
        if (!expandedGroups[svc.group]) { // collapsed / zoomed out
            if (!graph[svc.group]) {
                graph[svc.group] = {
                    expanded: false,
                    title: svc.group,
                    body: svc.name,
                    connectsTo: {}
                };
            } else {
                graph[svc.group].body += ('\n' + svc.name);
            }
            svc.connectsTo.forEach(function(dst) {
                // Filter out self links
                if (dst !== svc.group) {
                    graph[svc.group].connectsTo[dst] = true;
                }
            });
        } else { // expanded group
            if (!graph[svc.group]) {
                graph[svc.group] = {
                    expanded: true,
                    title: svc.group,
                    body: '',
                    services: [svc]
                };
            } else {
                graph[svc.group].services.push(svc);
            }
        }
    }
    console.log(graph);

    var list = Object.keys(graph).map(function(k) {return graph[k]});
    list.forEach(function(comp) {
        if (!comp.expanded) {
            comp.connectsTo = Object.keys(comp.connectsTo).map(function(k) {return k;});
        }
    });

    return list;
};

arch.makeDot = function(graph) {
    // shapes i might want: box, box3d (for multiple), oval, cylinder

    var dot = 'digraph {\n';
    dot += 'node [shape=box];\n';

    // Nodes, including subgraphs
    graph.forEach(function(comp, i) {
        if (comp.expanded) {
            dot += 'subgraph cluster_' + i + '{\n';
            dot += 'label="' + comp.title + '";\n';
            dot += 'graph[style=dashed];\n'
            comp.services.forEach(function(svc) {
                var nodeName = svc.name.replace(/[^\w]/gi, '_');
                dot += nodeName + ';\n';
                // svc.connectsTo.forEach(function(dst) {
                //     var nodeName = svc.name.replace(/[^\w]/gi, '_');
                //     var dstName = dst.replace(/[^\w]/gi, '_');
                //     dot += nodeName + ' -> ' + dstName + ';\n';
                // });
            });
            dot += '}\n';
        } else {
            var nodeName = comp.title.replace(/[^\w]/gi, '_');
            // TODO escape " in node text
            dot += nodeName + ' [style=dashed, label="' + comp.title + '\n-------\n' + comp.body + '"]\n'; // TODO escape "
        }
    });

    // Edges
    graph.forEach(function(comp, i) {
        if (comp.expanded) {
            comp.services.forEach(function(svc) {
                svc.connectsTo.forEach(function(dst) {
                    var nodeName = svc.name.replace(/[^\w]/gi, '_');
                    var dstName = dst.replace(/[^\w]/gi, '_');
                    dot += nodeName + ' -> ' + dstName + ';\n';
                });
            });
        } else { // collapsed/zoomed out
            var nodeName = comp.title.replace(/[^\w]/gi, '_');
            comp.connectsTo.forEach(function(dst) {
                var dstName = dst.replace(/[^\w]/gi, '_');
                dot += nodeName + ' -> ' + dstName + ';\n';
            });
        }
    });
    dot += '}';
    // {
    //   node [margin=0 fontcolor=blue fontsize=32 width=0.5 shape=circle style=filled]
    //   b [fillcolor=yellow fixedsize=true label="a very long label"]
    //   d [fixedsize=shape label="an even longer label"]
    // }
    // a -> {c d}
    // b -> {c d}

    // return dot;
    // return 'digraph {\n' +
    // '    a -> b;\nc' +
    // '    }';
    return dot;
};

arch.draw = function(system, expandedGroups) {
    var graph = arch.buildGraph(system, expandedGroups);
    console.log(graph);
    var dot = arch.makeDot(graph);
    console.log(dot);

    var svgHtml = Viz(dot, {format: 'svg'}); //, {engine: 'neato'});
    var svgEl = document.getElementById("graphContainer")
    svgEl.innerHTML = svgHtml;

    // var g = graphlibDot.parse(dot);
    // var renderer = new dagreD3.Renderer();

    // // document.getElementById("graphContainer").innerHTML = '<g/>';
    // renderer.run(g, d3.select("svg g"));

    // // Optional - resize the SVG element based on the contents.
    // var svg = document.querySelector('#graphContainer');
    var bbox = svgEl.getBBox();
    svgEl.style.width = bbox.width + 40.0 + "px";
    svgEl.style.height = bbox.height + 40.0 + "px";
};

window.onload = function() {
    arch.draw(SYSTEM, arch.expandedGroups);

    SYSTEM.forEach(function(svc) {
        arch.expandedGroups[svc.group] = false;
    });
    var expander = document.getElementById('expander');
    Object.keys(arch.expandedGroups).forEach(function(group) {
        // expander.innerHTML += '<input type="checkbox">' + group + '</input><br/>';
        var checkbox = document.createElement('input');
        checkbox.id = group;
        checkbox.type = 'checkbox';
        checkbox.onclick = function(event) {
            arch.expandedGroups[event.target.id] = event.target.checked;
            arch.draw(SYSTEM, arch.expandedGroups);
        };

        var label = document.createElement('label');
        label.htmlFor = group;
        label.appendChild(document.createTextNode(group));

        expander.appendChild(checkbox);
        expander.appendChild(label);
        expander.appendChild(document.createElement('br'))
    });
}
