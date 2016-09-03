window.arch = {};

// TODO 3rd level of nesting: libraries
// might want record based nodes for libs

arch.expandedGroups = {};

arch.buildGraph = function(system, expandedGroups) {
    // Deep clone system so this doesn't modify original
    system = JSON.parse(JSON.stringify(system));

    var groups = Object.keys(system);

    var groupByHiddenSvc = {};
    groups.forEach(function(group) {
        system[group].forEach(function(svc) {
            if (!expandedGroups[group]) { // collapsed / zoomed out
                groupByHiddenSvc[svc.name] = group;
            }
        });
    });
    console.log(groupByHiddenSvc);

    // Update link dests
    groups.forEach(function(group) {
        system[group].forEach(function(svc) {
            var newConnectsTo = {};
            if (svc.connectsTo !== undefined) {
                svc.connectsTo.forEach(function(dst) {
                    var newTarget = groupByHiddenSvc[dst];
                    if (newTarget) {
                        newConnectsTo[newTarget] = true;
                    } else {
                        newConnectsTo[dst] = true;
                    }
                });
            }
            svc.connectsTo = Object.keys(newConnectsTo);
        });
    });
    console.log(system);

    var graph = {};
    // for (var i = 0; i < system.length; i++) {
        // var svc = system[i];
    groups.forEach(function(group) {
        system[group].forEach(function(svc) {
            if (!expandedGroups[group]) { // collapsed / zoomed out
                if (!graph[group]) {
                    graph[group] = {
                        expanded: false,
                        title: group,
                        body: svc.name,
                        connectsTo: {}
                    };
                } else {
                    graph[group].body += ('\n' + svc.name);
                }
                svc.connectsTo.forEach(function(dst) {
                    // Filter out self links
                    if (dst !== group) {
                        graph[group].connectsTo[dst] = true;
                    }
                });
            } else { // expanded group
                if (!graph[group]) {
                    graph[group] = {
                        expanded: true,
                        title: group,
                        body: '',
                        services: [svc]
                    };
                } else {
                    graph[group].services.push(svc);
                }
            }
        });
    });
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
                // TODO escape " in svc.name
                dot += nodeName + '[label="' + svc.name + '"];\n';
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

    var bbox = svgEl.getBBox();
    svgEl.style.width = bbox.width + 40.0 + "px";
    svgEl.style.height = bbox.height + 40.0 + "px";
};

// From https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
arch.getParameterByName = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

window.onload = function() {
    var SYSTEM = jsyaml.load(SYSTEM_YAML);
    console.log(SYSTEM);

    var expand = arch.getParameterByName('expand');
    Object.keys(SYSTEM).forEach(function(group) {
        arch.expandedGroups[group] = (expand == 'true' || expand == group);
    });

    arch.draw(SYSTEM, arch.expandedGroups);

    var expander = document.getElementById('expander');
    Object.keys(arch.expandedGroups).forEach(function(group) {
        var checkbox = document.createElement('input');
        checkbox.id = group;
        checkbox.type = 'checkbox';
        checkbox.checked = arch.expandedGroups[group];
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
