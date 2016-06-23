var BubbleChart = Listenable.extend({
	construct : function() {
		this.radius = 700;
		this.fill = d3.scale.category20c();
		this.parameters = new Array();
	}
});

BubbleChart.prototype.setCategory = function(cat) {
	this.root = cat;
};

BubbleChart.prototype.setRadius = function(r) {
	this.radius = r;
};

BubbleChart.prototype.renderTo = function(parentDivId) {
	this.parentDiv = parentDivId;
	this.vis = d3.select('#' + this.parentDiv).append('svg')
				 .attr("viewBox","0 0 " + this.radius + " " + this.radius)
				 .attr("preserveAspectRatio", "xMidYMid meet")
				 .attr('width', '100%')
				 .attr('height', '100%')
				 .attr('class', 'bubble');
};

BubbleChart.prototype.loadBubbleChartForParam = function(param) {

	var bubble = new Bubble(this.radius).getBubble();
	var scope = this;

	var node = this.vis.selectAll('g.node').data(
			bubble.nodes(classes(scope.jsonString, scope.root, param)).filter(
					function(d) {
						return !d.children;
					})).enter().append('g').attr('class', 'node').on("click",
			function(d) {
				$(".tipsy").remove();
				scope.fireEvent(scope, 'onClick', d);
			}).attr('transform', function(d) {
		return 'translate(' + d.x + ',' + d.y + ')';
	});

	node.append('circle').attr('class', 'bubble-circle').attr('r', function(d) {
		return d.r;
	}).style('fill', function(d) {
		return scope.fill(d.packageName);
	});

	node.append('text').attr('class', 'bubble-text').attr('text-anchor',
			'middle').attr('dy', '.3em').text(function(d) {
		return d.className.substring(0, d.r / 3);
	});

	$('circle').tipsy({
		gravity : 'w',
		html : true,
		title : function() {
			var d = this.__data__;
			return d.className + ' : ' + d.value;
		}
	});
};

BubbleChart.prototype.load = function(queryString) {

	var scope = this;
	d3.json(queryString, function(json) {

		scope.jsonString = json;
		var i = 0, str = 0, tempStr = 'json.children', obj;
		for (str = tempStr; eval(tempStr) != undefined; tempStr = tempStr + '[0].children') {
			str = tempStr;
		}

		obj = eval(str + '[0]');
		for ( var attr in obj) {
			if (attr != scope.root)
				scope.parameters[i++] = attr;
		};

		if (scope.parameters[0])
			scope.loadBubbleChartForParam(scope.parameters[0]);
	});
};

Bubble = function(r) {
	return {
		getBubble : function() {
			var p = d3.layout.pack().sort(null).size([ r, r ]);
			return p;
		}
	};
};

function classes(root, n, p) {
	var classes = [];

	function recurse(name, node) {
		if (node.children)
			node.children.forEach(function(child) {
				recurse(eval('node.' + n), child);
			});
		else
			classes.push({
				packageName : name,
				className : eval('node.' + n),
				value : eval('node.' + p)
			});
	}

	recurse(null, root);
	return {
		children : classes
	};
}
