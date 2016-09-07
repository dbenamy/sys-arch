window.archDraw = {};

archDraw.expandedGroups = {};
archDraw.urlsByService = {};

archDraw.buildGraph = function(system, expandedGroups) {
    // `system` looks like:
    // {
    //     web: [
    //         {
    //             name: 'app',
    //             connectsTo: [
    //                 {
    //                     svc: 'db',
    //                     reason: 'user storage'
    //                 }
    //             ]
    //         }
    //     ]
    // }
    console.log(system);

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

    // Update connections to svcs in collapsed groups
    groups.forEach(function(group) {
        system[group].forEach(function(svc) {
            var newConnectsTo = {};
            svc.connectsTo.forEach(function(dst) {
                var newDst = groupByHiddenSvc[dst.svc] || dst.svc;
                if (newDst !== group) {
                    newConnectsTo[newDst] = newConnectsTo[newDst] || [];
                    newConnectsTo[newDst].push(dst.reason)
                }
            });
            svc.connectsTo = [];
            Object.keys(newConnectsTo).forEach(function(dstSvc) {
                var reason = newConnectsTo[dstSvc].join(' ');
                svc.connectsTo.push({svc: dstSvc, reason: reason});
            });
        });
    });
    console.log(system);

    // Make a slightly different data structure
    var nodes = [];
    groups.forEach(function(group) {
        nodes.push({
            expanded: !!expandedGroups[group],
            title: group,
            body: '',
            services: system[group]
        });
    });

    // Collapse appropriate groups
    nodes.forEach(function(node) {
        if (!node.expanded) {
            var grpConnTo = {};
            node.services.forEach(function(svc) {
                node.body += svc.name;
                if (svc.description) {
                    node.body += ': ' + svc.description;
                }
                node.body += '\n';

                svc.connectsTo.forEach(function(dst) {
                    grpConnTo[dst.svc] = grpConnTo[dst.svc] || [];
                    grpConnTo[dst.svc].push(dst.reason);
                });
            });
            node.connectsTo = [];
            Object.keys(grpConnTo).forEach(function(dstSvc) {
                node.connectsTo.push({
                    svc: dstSvc,
                    reason: grpConnTo[dstSvc].join(' ')
                });
            });
        }
    });

    return nodes;
};

archDraw.normalizeConnections = function(system) {
    Object.keys(system).forEach(function(group) {
        system[group].forEach(function(svc) {
            if (svc.connectsTo === undefined) {
                svc.connectsTo = [];
            }
            for (var i = 0; i < svc.connectsTo.length; i++) {
                if (svc.connectsTo[i] instanceof Array) {
                    svc.connectsTo[i] = {
                        svc: svc.connectsTo[i][0],
                        reason: svc.connectsTo[i][1]
                    };
                } else {
                    svc.connectsTo[i] = {
                        svc: svc.connectsTo[i],
                        reason: ''
                    };
                }
            }
        });
    });
}

archDraw.makeDot = function(graph) {
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
                var label = svc.name;
                if (svc.description) {
                    label += ': ' + svc.description;
                }
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
                    var dstName = dst.svc.replace(/[^\w]/gi, '_');
                    // TODO escape " in reason
                    dot += nodeName + ' -> ' + dstName + ' [label="' + dst.reason + '"];\n';
                });
            });
        } else { // collapsed/zoomed out
            var nodeName = comp.title.replace(/[^\w]/gi, '_');
            comp.connectsTo.forEach(function(dst) {
                var dstName = dst.svc.replace(/[^\w]/gi, '_');
                // TODO escape " in reason
                dot += nodeName + ' -> ' + dstName + ' [label="' + dst.reason + '"];\n';
            });
        }
    });
    dot += '}';
    return dot;
};

archDraw.draw = function(system, expandedGroups) {
    var graph = archDraw.buildGraph(system, expandedGroups);
    console.log(graph);
    var dot = archDraw.makeDot(graph);
    console.log(dot);

    var svgHtml = Viz(dot, {format: 'svg'});
    var svgEl = document.getElementById("graphContainer")
    svgEl.innerHTML = svgHtml;

    var bbox = svgEl.getBBox();
    svgEl.style.width = bbox.width + 40.0 + "px";
    svgEl.style.height = bbox.height + 40.0 + "px";

    // Linkify services
    document.querySelectorAll('g.node text').forEach(function(el) {
        var url = archDraw.urlsByService[el.textContent];
        if (url) {
            var a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
            el.parentNode.replaceChild(a, el);
            a.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url)
            a.appendChild(el);
        }
    });
};

archDraw.wrap = function(str) {
    var BATCH = 3;
    var words = str.split(' ');
    var lines = [];
    for (var i = 0; i < words.length; i += BATCH) {
        lines.push(words.slice(i, i + BATCH).join(' '));
    }
    return lines.join('\n');
};

archDraw.wrapReasons = function(system) {
    Object.keys(system).forEach(function(group) {
        system[group].forEach(function(svc) {
            svc.connectsTo.forEach(function(dst) {
                dst.reason = archDraw.wrap(dst.reason);
            });
        });
    });
};

// From https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
archDraw.getParameterByName = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

archDraw.init = function(system) {
    var body = document.createElement('body');
    body.innerHTML = `
        <table>
            <tr>
                <td>
                    Expand Groups:<br/>
                    <div id="expander"></div>
                </td>
                <td><svg id="graphContainer"></svg></td>
            </tr>
        </table>
    `;
    document.getElementsByTagName('html')[0].appendChild(body);

    var expand = archDraw.getParameterByName('expand');
    Object.keys(system).forEach(function(group) {
        archDraw.expandedGroups[group] = (expand == 'true' || expand == group);
    });

    Object.keys(system).forEach(function(group) {
        system[group].forEach(function(svc) {
            if (svc.url) {
                var label = svc.name;
                if (svc.description) {
                    label += ': ' + svc.description;
                }
                archDraw.urlsByService[label] = svc.url;
            }
        });
    });

    archDraw.normalizeConnections(system);
    archDraw.wrapReasons(system);
    console.log(system);

    archDraw.draw(system, archDraw.expandedGroups);

    var expander = document.getElementById('expander');
    Object.keys(archDraw.expandedGroups).sort().forEach(function(group) {
        var checkbox = document.createElement('input');
        checkbox.id = group;
        checkbox.type = 'checkbox';
        checkbox.checked = archDraw.expandedGroups[group];
        checkbox.onclick = function(event) {
            archDraw.expandedGroups[event.target.id] = event.target.checked;
            archDraw.draw(system, archDraw.expandedGroups);
        };

        var label = document.createElement('label');
        label.htmlFor = group;
        label.appendChild(document.createTextNode(group));

        expander.appendChild(checkbox);
        expander.appendChild(label);
        expander.appendChild(document.createElement('br'))
    });
}
