/*globals d3,console,ROTATE_ALL*/

var GENE_PADDING = 30000,
	LABEL_PADDING = 18,
	xhtmlns = "http://www.w3.org/1999/xhtml",
	GLYPH_RADIUS = 3,
	LEGEND_PADDING = 36;

function getScales(domains, ranges) {
	"use strict";
	var result = [],
		i;
	for (i = 0; i < domains.length; i += 1) {
		result.push(d3.scale.linear()
			.domain(domains[i])
			.range(ranges[i]));
	}
	return result;
}

function drawTriangle(g) {
	"use strict";
	g.append("path")
		.attr("class", "glyph")
		.attr("d", "M0,-" + GLYPH_RADIUS +
			   "L" + GLYPH_RADIUS + "," + GLYPH_RADIUS +
			   "L-" + GLYPH_RADIUS + "," + GLYPH_RADIUS +
			   "L0,-" + GLYPH_RADIUS);
}
function drawX(g) {
	"use strict";
	g.append("path")
		.attr("class", "glyph")
		.attr("d", "M-3,-3L3,3");
	g.append("path")
		.attr("class", "glyph")
		.attr("d", "M-3,3L3,-3");
}
function drawBox(g) {
	"use strict";
	var temp = GLYPH_RADIUS - 1;
	g.append("rect")
		.attr("class", "glyph")
		.attr("x", -temp)
		.attr("y", -temp)
		.attr("width", temp * 2)
		.attr("height", temp * 2);
}
function drawCircle(g) {
	"use strict";
	g.append("circle")
		.attr("class", "glyph")
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("r", GLYPH_RADIUS);
}

function VisComponent(containerId, xDomains, xRanges, label) {
	"use strict";
	var self = this,
		temp,
		x,
		y;
	self.containerId = containerId;
	self.container = document.getElementById(self.containerId);
	self.width = self.container.getAttribute('width');
	self.height = self.container.getAttribute('height');
	if (typeof label === 'string') {
		d3.select("#" + self.containerId)
			.append("text")
			.text(label)
			.attr("text-anchor", "end")
			.attr("transform", "translate(-" + LEGEND_PADDING + "," + (self.height / 2 + 3) + ")");
	} else if (typeof label === 'function') {
		label.apply(self, [d3.select("#" + self.containerId)]);
	}
	self.horizontalScales = getScales(xDomains, xRanges);
}

function Xaxis(containerId, xDomains, xRanges, label) {
	"use strict";
	var self = this,
		i;
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.xAxes = [];
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		self.xAxes.push(d3.svg.axis()
					.scale(self.horizontalScales[i])
				    .ticks(Math.floor((xRanges[i][1] - xRanges[i][0]) / 75))
					.orient("bottom"));
		// We want ticks at roughly every 75 pixels
		d3.select("#" + self.containerId)
			.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0,0)")
			.call(self.xAxes[i]);
	}
}
Xaxis.prototype = Object.create(VisComponent.prototype);
Xaxis.prototype.constructor = Xaxis;

function Histogram(values, containerId, xDomains, xRanges, label, bins) {
	"use strict";
	var self = this,
		i,
		j,
		temp,
		bar;
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.bins = bins;
	self.firstScaleBinProp = self.bins /
		(self.horizontalScales[0](xDomains[0][1]) -
		 self.horizontalScales[0](xDomains[0][0]));
	self.histograms = [];
	self.containers = [];
	self.maxBin = 0;

	for (i = 0; i < self.horizontalScales.length; i += 1) {
		self.containers.push(d3.select("#" + self.containerId)
			.append("g"));

		temp = d3.layout.histogram();
		temp.range(xDomains[i]);
		temp.bins(self.firstScaleBinProp *
			(self.horizontalScales[i](xDomains[i][1]) -
				self.horizontalScales[i](xDomains[i][0])));
		self.histograms.push(temp(values));

		for (j = 0; j < self.histograms[i].length; j += 1) {
			if (self.histograms[i][j].y > self.maxBin) {
				self.maxBin = self.histograms[i][j].y;
			}
		}
	}

	self.verticalScale = d3.scale.linear()
		.domain([0, self.maxBin])
		.range([self.height, 0]);
	
	function checkIfInRange(d) {
		return d.x >= xDomains[i][0] && d.x <= xDomains[i][1];
	}
	function getGroupTransform(d) {
		return "translate(" +
			self.horizontalScales[i](d.x) +
			"," +
			self.verticalScale(d.y) +
			")";
	}
	function getBarHeight(d) {
		return self.height - self.verticalScale(d.y);
	}

	for (i = 0; i < self.horizontalScales.length; i += 1) {
		bar = self.containers[i].selectAll(".histogramBar")
			.data(self.histograms[i])
			.enter().append("g")
			.filter(checkIfInRange)
			.attr("class", "histogramBar")
			.attr("transform", getGroupTransform);

		bar.append("rect")
			.attr("x", 1)
			.attr("width", self.horizontalScales[i](self.histograms[i][0].dx) -
				self.horizontalScales[i](0) - 1)
			.attr("height", getBarHeight);
	}

	self.yAxis = d3.svg.axis()
		.scale(self.verticalScale)
		.ticks(Math.floor(self.height / LABEL_PADDING))
		.orient("left");
	d3.select("#" + self.containerId)
		.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(0,0)")
		.call(self.yAxis);
}
Histogram.prototype = Object.create(VisComponent.prototype);
Histogram.prototype.constructor = Histogram;

function CoverageChart(data, containerId, xDomains, xRanges, label, maxCoverage) {
	"use strict";
	var self = this,
		foreignObj,
		canvasObj,
		xPos,
		yPos,
		i,
		j;
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.maxCoverage = maxCoverage;
	self.contexts = [];
	
	self.verticalScale = d3.scale.linear()
		.domain([0, self.maxCoverage])
		.range([self.height, 0]);
	
	function checkIfInRange(d) {
		return d.position >= xDomains[i][0] && d.position <= xDomains[i][1];
	}
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		// A properly scalable way to do this would be
		// OpenGL, but I'm not that hard core...
		foreignObj = d3.select("#" + self.containerId)
			.append("foreignObject")
			.attr("width", self.width)
			.attr("height", self.height);
		
		canvasObj = foreignObj.append("xhtml:canvas")
			.attr("id", "canvas" + i)
			.attr("width", self.width)
			.attr("height", self.height);
		
		self.contexts.push(canvasObj[0][0].getContext('2d'));
		self.contexts[i].fillStyle = "rgba(0, 0, 0, 0.05)";
		self.contexts[i].imageSmoothingEnabled = false;
		
		for (j = 0; j < data.length; j += 1) {
			xPos = Math.floor(self.horizontalScales[i](data[j].position));
			if (xPos >= xRanges[i][0] && xPos <= xRanges[i][1]) {
				yPos = Math.floor(self.verticalScale(data[j].average_coverage));
				self.contexts[i].fillRect(xPos, yPos, 1, self.height - yPos);
				//self.contexts[i].fillRect(xPos, yPos, 1, 1);
			}
		}
	}
	
	self.yAxis = d3.svg.axis()
		.scale(self.verticalScale)
		.ticks(Math.floor(self.height / LABEL_PADDING))
		.orient("left");
	d3.select("#" + self.containerId)
		.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(0,0)")
		.call(self.yAxis);
}
CoverageChart.prototype = Object.create(VisComponent.prototype);
CoverageChart.prototype.constructor = CoverageChart;

function GeneTrack(data, containerId, xDomains, xRanges, label) {
	"use strict";
	var self = this,
		start,
		stop,
		temp,
		gene,
		exon,
		i,
		j;
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.containers = [];
	self.genes = {};
	self.lastStops = [];
	
	for (i = 0; i < data.length; i += 1) {
		temp = false;
		for (j = 0; j < self.lastStops.length; j += 1) {
			if (self.lastStops[j] < data[i].start) {
				self.lastStops[j] = data[i].stop + GENE_PADDING;
				temp = true;
				data[i].row = j;
				break;
			}
		}
		if (temp === false) {
			data[i].row = self.lastStops.length;
			self.lastStops.push(data[i].stop + GENE_PADDING);
		}
	}
	
	self.rowHeight = self.height / self.lastStops.length - LABEL_PADDING;
	
	function checkIfInRange(d) {
		return d.stop >= xDomains[i][0] && d.start <= xDomains[i][1];
	}
	function getGeneName(d) {
		var result = d.name;
		if (d.direction === '-') {
			result = "\u2190 " + result;	// Unicode left arrow
		} else {
			result = result + " \u2192";	// Unicode right arrow
		}
		return result;
	}
	function getExons(d) {
		return d.exons;
	}
	function getGeneTransform(d) {
		return "translate(0," +
			d.row * (LABEL_PADDING + self.rowHeight) +
			")";
	}
	function getBarStart(d) {
		var s = Math.floor(self.horizontalScales[i](d.start));
		if (xRanges[i][0] > s) {
			s = xRanges[i][0];
		}
		return s;
	}
	function getBarEnd(d) {
		var e = Math.ceil(self.horizontalScales[i](d.stop));
		if (xRanges[i][1] < e) {
			e = xRanges[i][1];
		}
		return e;
	}
	function getBarWidth(d) {
		return getBarEnd(d) - getBarStart(d);
	}
	function getTextAnchor(d) {
		var p = getBarStart(d) + getBarWidth(d) / 2;
		return "translate(" + p + ", " + (LABEL_PADDING - 2) + ")";
	}
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		self.containers.push(d3.select("#" + self.containerId)
			.append("g"));
		
		gene = self.containers[i].selectAll(".gene")
			.data(data, getGeneName)
			.enter().append("g")
			.filter(checkIfInRange)
			.attr("class", "gene")
			.attr("transform", getGeneTransform);
		
		gene.append("rect")
			.attr("class", "centerLine")
			.attr("x", getBarStart)
			.attr("y", LABEL_PADDING + self.rowHeight / 2)
			.attr("width", getBarWidth)
			.attr("height", 1);
		
		gene.append("text")
			.text(getGeneName)
			.attr("text-anchor", "middle")
			.attr("transform", getTextAnchor);
		
		exon = gene.selectAll(".exon")
			.data(getExons)
			.enter().append("rect")
			.filter(checkIfInRange)
			.attr("class", "exon")
			.attr("x", getBarStart)
			.attr("y", LABEL_PADDING)
			.attr("width", getBarWidth)
			.attr("height", self.rowHeight);
	}
}
GeneTrack.prototype = Object.create(VisComponent.prototype);
GeneTrack.prototype.constructor = GeneTrack;

function GanttChart(data, containerId, xDomains, xRanges, label) {
	"use strict";
	var self = this,
		ganttBar,
		i;
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.containers = [];
	
	function checkIfInRange(d) {
		return d.stop >= xDomains[i][0] && d.start <= xDomains[i][1];
	}
	function getBarStart(d) {
		var s = Math.floor(self.horizontalScales[i](d.start));
		if (xRanges[i][0] > s) {
			s = xRanges[i][0];
		}
		return s;
	}
	function getBarEnd(d) {
		var e = Math.ceil(self.horizontalScales[i](d.stop));
		if (xRanges[i][1] < e) {
			e = xRanges[i][1];
		}
		return e;
	}
	function getBarWidth(d) {
		return getBarEnd(d) - getBarStart(d);
	}
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		self.containers.push(d3.select("#" + self.containerId)
			.append("g"));
		
		ganttBar = self.containers[i].selectAll(".ganttBar")
			.data(data)
			.enter().append("rect")
			.filter(checkIfInRange)
			.attr("class", "ganttBar")
			.attr("x", getBarStart)
			.attr("y", 0)
			.attr("width", getBarWidth)
			.attr("height", self.height);
	}
}
GanttChart.prototype = Object.create(VisComponent.prototype);
GanttChart.prototype.constructor = GanttChart;

function MinusLog10Plot(data, containerId, xDomains, xRanges, label, group, attrib, drawGlyph, omitYaxis) {
	"use strict";
	var self = this,
		point,
		i,
		log10 = Math.log(10);
	VisComponent.call(self, containerId, xDomains, xRanges, label);
	self.containers = [];
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		self.containers.push(d3.select("#" + self.containerId)
			.append("g"));
		
	}
	
	function minusLog10(v) {
		return -Math.log(v) / log10;
	}
	
	self.verticalScale = d3.scale.linear()
		.domain([0, 5])
		.range([self.height, 0]);
	
	function checkIfInRange(d) {
		return isNaN(Number(d[attrib])) === false && d.group === group && d.position >= xDomains[i][0] && d.position <= xDomains[i][1];
	}
	function getGroupTransform(d) {
		return "translate(" +
			self.horizontalScales[i](d.position) +
			"," +
			self.verticalScale(Number(d[attrib])) + //self.verticalScale(minusLog10(Number(d[attrib])))
			")";
	}
	
	for (i = 0; i < self.horizontalScales.length; i += 1) {
		point = self.containers[i].selectAll(".scatterPoint")
			.data(data)
			.enter().append("g")
			.filter(checkIfInRange)
			.attr("class", "scatterPoint")
			.attr("transform", getGroupTransform);
		
		drawGlyph(point);
	}
	
	if (omitYaxis !== true) {
		self.yAxis = d3.svg.axis()
			.scale(self.verticalScale)
			.ticks(5)
			.orient("left");
		d3.select("#" + self.containerId)
			.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(0,0)")
			.call(self.yAxis);
	}
}