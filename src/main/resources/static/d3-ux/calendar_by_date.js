var CalenderByDate = Listenable.extend({
	construct : function() {

		this.m = [ 19, 20, 20, 19 ], // top right bottom left margin
		this.w = 960 - this.m[1] - this.m[3], // width
		this.h = 136 - this.m[0] - this.m[2], // height
		this.z = 17; // cell size

		this.day = d3.time.format("%w"), 
		this.week = d3.time.format("%U"),
		this.format = d3.time.format("%Y-%m-%d");

		this.startYear = "2050-12-31", this.endYear = "1990-01-01";
		this.parameters = new Array();
		this.legendColors = new Array("#FFFFE5", "#FFF7BC", "#FEE391", "#FEC44F", "#FE9929", "#EC7014", "#CC4C02", "#993404", "#662506");
	}
});

CalenderByDate.prototype.load = function(queryString) {
	var scope = this;
	d3.csv(queryString, function(csv) {

		scope.csvString = csv;
		csv.forEach(function(row) {

			if (d3.ascending(eval('row.' + scope.key), scope.startYear) < 0) {
				scope.startYear = eval('row.' + scope.key);
			}
			if (d3.ascending(eval('row.' + scope.key), scope.endYear) > 0) {
				scope.endYear = eval('row.' + scope.key);
			}
		});
		scope.startYear = scope.format.parse(scope.startYear).getFullYear();
		scope.endYear = scope.format.parse(scope.endYear).getFullYear();
		if (scope.startYear == scope.endYear) {
			scope.endYear = scope.startYear + 1;
		}
		obj = eval('csv[0]');
		var i = 0;
		for ( var attr in obj) {
			if (attr != scope.key)
				scope.parameters[i++] = attr;
		};

		if (scope.parameters[0])
			scope.loadCalenderForParam(scope.parameters[0]);
	});
};

CalenderByDate.prototype.setCategory = function(k) {
	this.key = k;
};

CalenderByDate.prototype.initializeDivs = function() {
	d3.select('#' + this.parentDiv).text([ null ]);
	scope = this;
	var width  = scope.w + scope.m[1] + scope.m[3], height = scope.h + scope.m[0] + scope.m[2];
    var margin = width + 30;
	this.svg = d3.select('#' + this.parentDiv).selectAll("svg")
	             .data(d3.range(scope.startYear, scope.endYear + 1)).enter().append("svg")
	             .attr("width", width + 'px')
	             .attr("height", height + 'px')
	             .attr("class", "RdYlGn")
	             .style('position','relative')
	             .style('overflow','hidden')
	             .style('top', '0')
	             .style('left', '0').append("g")
	             .attr("transform", "translate(" + (scope.m[3] + (scope.w - scope.z * 53) / 2)
							+ "," + (scope.m[0] + (scope.h - scope.z * 7) / 2) + ")");

	this.htmlDiv = d3.select('#' + this.parentDiv).append("div")
	 .attr('class', 'caldate_table')
	 .attr('id', 'caldate_div')
	 .style('position','absolute')
     .style('overflow','hidden')
     .style('left', margin + "px")
     .style('top', '0')
	 .style("width", 300 + "px")
	 .style("height", 300 + "px");

};

CalenderByDate.prototype.loadCalenderForParam = function(param) {

	this.initializeDivs();

	var maxVal = 0;
	var scope = this;
	var data = d3.nest().key(function(d) {
		return eval('d.' + scope.key);
	}).rollup(function(d) {
		var val = eval('d[0].' + param);
		if (d3.ascending(eval(val), eval(maxVal)) > 0) {
			maxVal = val;
		}
		return val;
	}).map(scope.csvString);

	maxVal = Math.round(eval(maxVal) + 1);
	maxVal = maxVal + 9 - (maxVal % 9);
	scope.color = d3.scale.quantize().domain([ 0, maxVal ]).range(d3.range(9));

	scope.svg.append("text").attr("transform",
			"translate(-6," + scope.z * 3.5 + ")rotate(-90)").attr(
			"text-anchor", "middle").text(String);

	scope.rect = scope.svg.selectAll("rect.day").data(function(d) {
		return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
	}).enter().append("rect").attr("class", "day").on("click", function(d) {
		$(".tipsy").remove();
		scope.fireEvent(scope, 'onClick', d);
	}).attr("width", scope.z).attr("height", scope.z).attr("x", function(d) {
		return scope.week(d) * scope.z;
	}).attr("y", function(d) {
		return scope.day(d) * scope.z;
	}).map(scope.format);

	scope.svg.selectAll("path.month")
			.data(function(d) {
						return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
			})
			.enter()
			.append("path")
			.attr("class", "month")
			.attr("d", function(t0) {
						var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1,
								0), d0 = +scope.day(t0), w0 = +scope.week(t0), d1 = +scope
								.day(t1), w1 = +scope.week(t1);

						return "M" + (w0 + 1) * scope.z + "," + d0 * scope.z
								+ "H" + w0 * scope.z + "V" + 7 * scope.z 
								+ "H" + w1 * scope.z + "V" + (d1 + 1) * scope.z 
								+ "H" + (w1 + 1) * scope.z + "V" + 0 + "H" + (w0 + 1)* scope.z + "Z";
			});

	scope.rect.filter(function(d) {
		return d in data;
	}).attr("class", function(d) {
		return "day q" + scope.color(data[d]) + "-9";
	}).attr('param', function(d) {
		return  eval(data[d]);
	});

	this.subscribeForToolTip(param);
	this.displayLegendTable(param, maxVal);
};

CalenderByDate.prototype.subscribeForToolTip = function() {

	var scope = this;
	$('rect.day')
			.tipsy(
					{
						gravity : 'w',
						html : true,
						title : function() {

							if (this.attributes.getNamedItem('param'))
								return this.__data__
										+ ' : '
										+ this.attributes.getNamedItem('param').nodeValue;
							else
								return ' ';
						}
					});
};

CalenderByDate.prototype.displayLegendTable = function(param, maxVal) {
	document.getElementById('caldate_div').innerHTML = "";
	var scope = this;
	var htmlString = '', tableString = '<br/><br/><table border="2"><tr><th>Color</th><th>Range</th></tr>', delta = 0;
	this.parameters.forEach(function(p) {
		if (p == param)
			htmlString += '<input id=' + p 	+ ' type="radio" name="param" value=' + p + ' checked="checked"><label for=' + p + '>' + p 	+ '</label><br/>';
		else
			htmlString += '<input id=' + p + ' type="radio" name="param" value=' + p + '><label for=' + p + '>' + p + '</label><br/>';
	});

	htmlString += tableString;

	for ( var i = 0; i < 9; i++) {
		htmlString += '<tr><td bgcolor=' + scope.legendColors[i] + '></td><td>'	+ delta + '-' + eval(eval(delta) + (maxVal / 9)) + '</td></tr>';
		delta = eval(delta) + eval(maxVal / 9);
	};
	$('.caldate_table').append(htmlString + '</table>');
	d3.selectAll("input[name=param]").on("change", function() {
		var val = this.value;
		scope.loadCalenderForParam(val);
	});

};

CalenderByDate.prototype.renderTo = function(parentDivId) {
	this.parentDiv = parentDivId;
};
