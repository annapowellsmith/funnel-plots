$(document).ready(function() {
	
    // Check for FileReader and SVG support. We need both, at the moment.
    if ((window.FileReader) && (document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"))) {
    $('#get-started').removeClass('hidden');

	//     $('#get-started').click(function () { 
	// 
	// $(this).hide();
	// });
	$('#user-journey').removeClass('hidden');
	
        $('#thefile').change(function(e) {
            // TODO: Check acceptable file size, file type, etc here.
            if (e.target.files != undefined) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    var str = e.target.result;
                    //$('#file-text').text(str).removeClass('hidden');
                    $('#file-options').removeClass('hidden');
                    var csvArray = d3.csv.parseRows(str);
                    //console.log('csvArray', csvArray);
                    var titles = csvArray[0];
                    csvArray.splice(0,1);
                    var title_html = '';
                    _.each(titles,
                    function(item, i) {
	                    console.log(item, i);
                        title_html += '<option value="' + i + '">' + item + '</option>';
                    });
console.log(title_html);
                    $('#select-population-col, #select-indicator-col, #select-name-col').html(title_html);

                    $('#form-options').submit(function(e) {
                        e.preventDefault();
                        /**********************************
					    Set up the dataset.
					    **********************************/
						// console.log($('#select-population-col').val(), titles);
						// console.log($('#select-indicator-col').val(), titles);
						// console.log($('#select-name-col').val(), titles);
                        var POPULATION_COL = $('#select-population-col').val();
                        var POPULATION_NAME = $('#select-population-col option:selected').text();
                        var INDICATOR_COL = $('#select-indicator-col').val();
                        var INDICATOR_NAME = $('#select-indicator-col option:selected').text();
                        var NAME_COL = $('#select-name-col').val();
                        console.log(POPULATION_COL, INDICATOR_COL, NAME_COL, titles);
                        // TODO: This only works for raw numbers. Add percentage options.
                        var dataset = [];
                        _.each(csvArray,
                        function(item, i) {
	                        if ((item[INDICATOR_COL] !== '') && (typeof item[INDICATOR_COL] !== "undefined") 
	                             && (parseFloat(item[POPULATION_COL]) !== 0.0)) {
	                            var data = {};
	                            data['sample_size'] = parseFloat(item[POPULATION_COL].replace(',', ''));
	                            data['indicator'] = parseFloat(item[INDICATOR_COL]);
	                            data['ratio'] = data['indicator'] / data['sample_size'];
	                            data['name'] = item[NAME_COL];
	                            dataset.push(data);
	                        }
                        });

                        // Reorder the dataset by population size (this matters for 
	                    // drawing confidence interval areas later on).
						function compare(a,b) {
						  if (a.sample_size < b.sample_size)
						     return -1;
						  if (a.sample_size > b.sample_size)
						    return 1;
						  return 0;
						}
						dataset.sort(compare);
						
						// Create an alphabetical list of names. 
                        var sorted_names = [];
                        $.each(dataset,
                        function(i, v) {
                            sorted_names.push(v['name']);
                        });
                        sorted_names.sort();

                        // Calculate the mean incidence over the entire population.
                        var total_population = 0.0, total_incidence = 0.0;
                        _.each(dataset,
                        function(item) {
                            total_population += item['sample_size'];
                            total_incidence += item['indicator'];
                        });
                        var mean_incidence_rate = total_incidence / total_population;
                        var mean_incidence = total_incidence / dataset.length;
                        console.log(total_incidence, total_population, mean_incidence, mean_incidence_rate);

                        var sigma_squared = mean_incidence_rate * (1 - mean_incidence_rate);

                        // Now calculate the standard error for each value: SE = SD / root(n)
                        _.each(dataset,
                        function(item) {
                            item['std_error'] = Math.sqrt(sigma_squared / item['sample_size']);
                            item['plus_2sd'] = mean_incidence_rate + (2 * item['std_error']);
                            item['minus_2sd'] = mean_incidence_rate - (2 * item['std_error']);
                            item['plus_3sd'] = mean_incidence_rate + (3 * item['std_error']);
                            item['minus_3sd'] = mean_incidence_rate - (3 * item['std_error']);
                        });
                        console.log(dataset);

                        /**********************************
					        Now draw the graph. 
					        **********************************/
					    // Graph basics. 
                        $('svg').remove();
                        var w = $('#tab1').width();
                        var h =  $(document).height() - 300;
                        var padding = 30;
                        var svg = d3.select("#graph-container")
                        .append("svg")
                        .attr("width", w)
                        .attr("height", h);
                        var tooltip = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 1e-6);
                        $('div.tooltip').hide();
                        var max_x = d3.max(dataset,
                        function(d) {
                            return d['sample_size'];
                        });
                        var min_x = d3.min(dataset,
                        function(d) {
                            return d['sample_size'];
                        });

                        //Create scale functions
                        var xScale = d3.scale.linear()
                        .domain([0, max_x])
                        .range([padding, w - padding * 2]);
                        var yScale = d3.scale.linear()
                        .domain([0, d3.max(dataset,
                        function(d) {
                            //return d3.max([d['ratio'] * 100, d['plus_3sd'] * 100]);
 return d3.max([d['ratio'], d['plus_3sd']]);
                        })])
                        .range([h - padding, padding]);

                        // Draw axes and axis labels. 
                        var formatAsPercentage = d3.format("%");
                        var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5)
                        .tickSize(4,0,0);
                        var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .ticks(5)
                        .tickSize(4,0,0)
                        .tickFormat(formatAsPercentage);
                        svg.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + (h - padding) + ")")
                        .call(xAxis);
                        svg.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(" + padding + ",0)")
                        .call(yAxis);
                        $('#x-axis-label').text(POPULATION_NAME);
                        $('#y-axis-label').text(INDICATOR_NAME);
                        $('#x-axis-label').css('top',(h-10)+'px').css('left',(w-100)+'px');

                        // Draw the confidence interval lines.
                        var confidence3sd_lower = d3.svg.line().
                        x(function(d) {
                            return xScale(d['sample_size']);
                        }).
                        y(function(d) {
                            if (d['minus_3sd'] < 0.0) {
                                return yScale(0);
                            } else {
                                return yScale(d['minus_3sd']); 
                            }
                        }).
                        interpolate("linear");
                        var confidence3sd_upper = d3.svg.line().
                        x(function(d) {
                            return xScale(d['sample_size']);
                        }).
                        y(function(d) {
                            return yScale(d['plus_3sd']); 
                        }).
                        interpolate("linear");
                        var confidence2sd_lower = d3.svg.line().
                        x(function(d) {
                            return xScale(d['sample_size']);
                        }).
                        y(function(d) {
                            if (d['minus_2sd'] < 0.0) {
                                return yScale(0);
                            } else {
                                return yScale(d['minus_2sd']);
                            }
                        });
                        var confidence2sd_upper = d3.svg.line().
                        x(function(d) {
                            return xScale(d['sample_size']);
                        }).                        
                        y(function(d) {
                            return yScale(d['plus_2sd']);
                        }).
                        interpolate("linear");
                        svg.append("svg:path").
                        attr("d", confidence2sd_upper(dataset)).
                        attr("class", "confidence95");  
                        svg.append("svg:path").
                        attr("d", confidence2sd_lower(dataset)).
                        attr("class", "confidence95");  
                        svg.append("svg:path").
                        attr("d", confidence3sd_upper(dataset)).
                        attr("class", "confidence99");  
                        svg.append("svg:path").
                        attr("d", confidence3sd_lower(dataset)).
                        attr("class", "confidence99");                      
                        $('#confidence-label').css('left',(w-100)+'px');
                        
                        // Draw line to indicate mean.
                        svg.append("svg:line")
                        .attr("x1", xScale(min_x))
                        .attr("y1", yScale(mean_incidence_rate)) // * 100))
                        .attr("x2", xScale(max_x))
                        .attr("y2", yScale(mean_incidence_rate)) // * 100))
                        .style("stroke", "rgba(6,120,155,0.6)")
                        .style("stroke-width", 1)
                        .on("mouseover",
                        function(d, i) {
                            $('div.tooltip').show();
                            tooltip.transition()
                            .duration(100)
                            .style("opacity", 1);
                        }).on("mousemove",
                        function() {
                            var divHtml = '<h4>Mean value</h4>';
                            // TODO: Adjust the size of the tooltip to fit the h4 text, if needed.
                            var left_position = (d3.event.pageX - 2) + "px";
                            tooltip.html(divHtml)
                            //
                            .style("left", left_position)
                            .style("top", (d3.event.pageY - 80) + "px");
                        }).on("mouseout",
                        function(d, i) {
                            tooltip.transition()
                            .duration(100)
                            .style("opacity", 1e-6);
                        });

                        //Create circles
                        svg.selectAll("circle")
                        .data(dataset)
                        .enter()
                        .append("circle")
                        .attr("fill", "rgba(22, 68, 81, 0.6)")
                        .attr("cx",
                        function(d) {
                            return xScale(d['sample_size']);
                        })
                        .attr("cy",
                        function(d) {
                            return yScale(d['ratio']) // * 100);
                        })
                        .attr("name",
                        function(d) {
                            return $.inArray(d['name'],sorted_names);
                        })
                        .attr("r", 5)
                        .on("mouseover",
                        function(d, i) {
                            $('div.tooltip').show();
                            tooltip.transition()
                            .duration(100)
                            .style("opacity", 1);
                        }).on("mousemove",
                        function(d, i) {
                            var divHtml = '<h4>' + d['name'] + '</h4>';
                            divHtml += '<strong>Population: </strong> ' + d['sample_size'] + '<br/>';
                            divHtml += '<strong>Percentage: </strong> ' + (d['ratio'] * 100).toFixed(2) + '%';
                            // TODO: Adjust the size of the tooltip to fit the h4 text, if needed.
                            if ($(window).width() - d3.event.pageX < 160) {
                                var left_position = (d3.event.pageX - 155) + "px";
                            } else {
                                var left_position = (d3.event.pageX - 2) + "px";
                            }
                            tooltip.html(divHtml)
                            //
                            .style("left", left_position)
                            .style("top", (d3.event.pageY - 80) + "px");
                        }).on("mouseout",
                        function(d, i) {
                            tooltip.transition()
                            .duration(100)
                            .style("opacity", 1e-6);
                        });

                        var select_html = '<option value=""></option>';
                        $.each(sorted_names,
                        function(i, v) {
                            select_html += '<option value="' + i + '">' + v + '</option>';
                        });
                        $('#select-entry').html(select_html);
						$('#select-entry').change(function(e) { 
							//$('circle').css('fill','rgba(, 0.9)');
							// Clear any existing circle styles.
							d3.select('circle').transition().transition(2).attr("r", 5);
							// Highlight the circle with the same name val. 
							var circle = d3.select('circle[name="' + $(this).val() + '"]');
							circle.transition().duration(800).attr("r", 10);
							//circle.transition().duration(800).attr("r", 5);
							//circle.attr('fill','rgba(120, 220, 54, 1.0)');
						});

                        // Aaand show the graph.
                        $('#graph-not-ready, #embed-not-ready').hide();
                        $('#graph, #embed').removeClass('hidden');
                        $('#tabs a[href="#tab2"]').tab('show');

                        // TODO: correct the width.
                    });

                };

                reader.readAsText(e.target.files.item(0));

            }
        });

    } else {
        $('#ie-apology').removeClass('hidden');
    }

});