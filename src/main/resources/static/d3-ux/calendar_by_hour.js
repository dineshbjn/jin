var CalendarByHour = Listenable.extend({
	construct : function() {

		this.m = [ 19, 20, 20, 19 ], // top right bottom left margin
		this.w = 1100 - this.m[1] - this.m[3], // width
		this.h = 160 - this.m[0] - this.m[2], // height
		this.z = 17; // cell size

		this.indexToYear = d3.map();
		this.hour = d3.time.format("%H");
		this.day = d3.time.format("%w");
		this.format = d3.time.format("%Y-%m-%d:%H-%M-%S");
		this.parameters = new Array(), this.array =  new Array();

		this.legendFormat = d3.time.format("%Y-%m-%d");
		this.startWeek = 0, this.endWeek = 0;
		this.legendColors = new Array("#FFFFE5", "#FFF7BC", "#FEE391", "#FEC44F", "#FE9929", "#EC7014", "#CC4C02", "#993404", "#662506");
	}
});

CalendarByHour.prototype.load = function(queryString) {

	var scope = this;
	d3.csv(queryString, function(csv) {
		scope.csvString = csv;

		csv.forEach(function(d) {
			if (eval('d.' + scope.root) && scope.startWeek == 0) {
				scope.startWeek = eval('d.' + scope.root);
			}
			if (eval('d.' + scope.root)) {
				scope.endWeek = eval('d.' + scope.root);
			}
		});

		scope.setIndexToYearArray();
		var obj = eval('csv[0]'), i = 0;
		for ( var attr in obj) {
			if (attr != scope.root)
				scope.parameters[i++] = attr;
		};

		if (scope.parameters[0])
			scope.loadCalendarByHourForParam(scope.parameters[0]);

	});
};

CalendarByHour.prototype.initializeDivs = function() {
	d3.select('#' + this.parentDiv).text([ null ]);
	scope = this;
	
	var width = scope.w + scope.m[1] + scope.m[3], height = scope.h + scope.m[0] + scope.m[2];
	var margin = width + 30;
	
	this.svg = d3.select("#" + this.parentDiv).selectAll("svg")
	 			 .data(this.array)
	             .enter().append("svg")
	             .attr("width", width + "px")
	             .attr("height", height + "px")
	             .attr("class", "RdYlGn")
	             .style('position','relative')
	             .style('overflow','hidden')
	             .style('top', '0')
	             .style('left', '0').append("g")
	             .attr("transform",	"translate(" + (scope.m[3] + (scope.w - scope.z * 53) / 2) + ","
					+ (scope.m[0] + (scope.h - scope.z * 7) / 2) + ")");
	
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

CalendarByHour.prototype.renderTo = function(parentDivId) {
	this.parentDiv = parentDivId;
};

CalendarByHour.prototype.setCategory = function(cat) {
	this.root = cat;
};


CalendarByHour.prototype.displayTooltip = function() {

	var format = d3.time.format("%Y-%m-%d:%H-%M-%S");
	var format2 = d3.time.format("%Y-%m-%d");
	$('rect.hour')
			.tipsy(
					{
						gravity : 'w',
						html : true,
						title : function() {
							var d = format.parse(this.__data__);
							if (this.attributes.getNamedItem('param')) {
								return format2(d) + ' : ' + this.attributes.getNamedItem('param').nodeValue;
							} else {
								return ' ';
							}
						}
					});
};
CalendarByHour.prototype.setIndexToYearArray = function() {

	var t1 = this.format.parse(this.startWeek).getFullYear();
	var t2 = this.format.parse(this.endWeek).getFullYear();

	if (t1 < t2) {
		this.array = this.array.concat(d3.range(this.format.parse(this.startWeek).getWeek(0), this.format.parse(t1 + "-12-31:23-00-00").getWeek(0) + 1));
		this.indexToYear.set(array.length - 1, t1);
		var i;
		for (i = t1 + 1; i < t2; i++) {
			this.array = this.array.concat(d3.range(1, this.format.parse(i + "-12-31:23-00-00").getWeek(0) + 1));
			this.indexToYear.set(this.array.length - 1, i);
		}

		this.array = this.array.concat(d3.range(1, this.format.parse(this.endWeek).getWeek(0) + 1));
		this.indexToYear.set(this.array.length - 1, t2);
	} else if (t1 > t2) {
		this.array = this.array.concat(d3.range(this.format.parse(this.startWeek).getWeek(0), 1, -1));
		this.indexToYear.set(this.array.length - 1, t1);
		var i;
		for (i = t1 - 1; i > t2; i--) {
			this.array = this.array.concat(d3.range(this.format.parse(i + "-12-31:23-00-00").getWeek(0) + 1, 1, -1));
			this.indexToYear.set(this.array.length - 1, i);
		}

		this.array = this.array.concat(d3.range(this.format.parse(t2 + "-12-31:23-00-00").getWeek(0) + 1, this.format.parse(this.endWeek).getWeek(0) - 1, -1));
		this.indexToYear.set(this.array.length - 1, t2);
	} else {
		this.startWeek = this.format.parse(this.startWeek).getWeek(0);
		this.endWeek = this.format.parse(this.endWeek).getWeek(0);

		if (d3.ascending(this.startWeek, this.endWeek) < 1) {
			this.array = d3.range(this.startWeek, this.endWeek + 1);
		} else {
			this.array = d3.range(this.startWeek, this.endWeek - 1, -1);
		}

		this.indexToYear.set(this.array.length - 1, t1);
	}

};
CalendarByHour.prototype.loadCalendarByHourForParam = function(param) {

	this.initializeDivs();
	var maxVal = 0, scope = this;
	var data = d3.nest().key(function(d) {
		return eval('d.' + scope.root);
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

	scope.svg.selectAll("legend-hours")
	          .data(d3.range(0, 24)).enter()
	          .append("text")
			  .attr("transform", function(d, i) {
				return "translate(" + scope.z * i + "," + -scope.z / 4 + ")";
			   }).text(String);

	scope.svg.selectAll("legend-dates").data(
			function(d, i) {
				var y1 = 0;
				scope.indexToYear.forEach(function(key, value) {
					if (eval(i) <= key && (y1 == 0)) {
						y1 = value;
					}
				});

				var d1 = getDateRangeOfWeek(eval(d), eval(y1));
				return d3.time.days(new Date(d1.getFullYear(), d1.getMonth(),
						d1.getDate()), new Date(d1.getFullYear(),
						d1.getMonth(), d1.getDate() + 7));
			}).enter().append("text").attr("transform", function(d, i) {
		return "translate(" + -40 + "," + (scope.z / 2 + (scope.z * i)) + ")";
	}).attr("text-anchor", "middle").text(function(d) {
		return scope.legendFormat(d);
	});

	var rect = scope.svg.selectAll("rect.hour").data(
			function(d, i) {
				var y2 = 0;
				scope.indexToYear.forEach(function(key, value) {
					if (eval(i) <= key && (y2 == 0)) {
						y2 = value;
					}
				});
				var d1 = getDateRangeOfWeek(eval(d), eval(y2));
				d1.setHours(00, 00, 00, 00);
				return d3.time.hours(new Date(d1.getFullYear(), d1.getMonth(),
						d1.getDate()), new Date(d1.getFullYear(),
						d1.getMonth(), d1.getDate() + 7));
			}).enter().append("rect").attr("class", "hour").on("click",
			function(d) {
				 $(".tipsy").remove();
			    	 scope.fireEvent(scope, 'onClick', d);

			}).attr("width", scope.z).attr("height", scope.z).attr("x", function(d) {
		return (scope.hour(d) % 24) * scope.z;
	}).attr("y", function(d) {
		return scope.day(d) * scope.z;
	}).map(scope.format);

	rect.filter(function(d) {
		return d in data;
	}).attr("class", function(d) {
		return "hour q" + scope.color(data[d]) + "-9";
	}).attr("param", function(d) {
		return eval(data[d]);
	});

	this.displayTooltip();
	this.displayLegendTable(param, maxVal);

};

CalendarByHour.prototype.displayLegendTable = function(param, maxVal) {
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
		scope.loadCalendarByHourForParam(val);
	});

};

Date.prototype.getWeek = function(dowOffset) {
	dowOffset = typeof (dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
	var newYear = new Date(this.getFullYear(), 0, 1);
	var day = newYear.getDay() - dowOffset; //the day of week the year begins on
	day = (day >= 0 ? day : day + 7);
	var daynum = Math
			.floor((this.getTime() - newYear.getTime() - (this
					.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
	var weeknum;
	if (day < 4) {
		weeknum = Math.floor((daynum + day - 1) / 7) + 1;
		if (weeknum > 52) {
			nYear = new Date(this.getFullYear() + 1, 0, 1);
			nday = nYear.getDay() - dowOffset;
			nday = nday >= 0 ? nday : nday + 7;
			weeknum = nday < 4 ? 1 : 53;
		}
	} else {
		weeknum = Math.floor((daynum + day - 1) / 7);
	}
	return weeknum;
};

function getDateRangeOfWeek(weekNo, fullyear) {
	var d1 = new Date();
	d1.setFullYear(fullyear);
	d1.setDate(d1.getDate() - eval(d1.getDay()));
	var weekNoToday = d1.getWeek();
	var weeksInTheFuture = eval(weekNo - weekNoToday);
	d1.setDate(d1.getDate() + eval(7 * weeksInTheFuture));
	return d1;

};