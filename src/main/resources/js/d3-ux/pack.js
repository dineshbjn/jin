var PackChart = Listenable.extend({
	construct : function() {
		this.legendMap = new Map();
		this.parameters = new Array();
	}
});

PackChart.prototype.getToolTip = function(param) {
	var scope = this;
	var format = d3.format(' ,d');
	$('g.node').tipsy(
			{
				gravity : 'w',
				html : true,
				title : function() {
					var d = this.__data__;
					return eval('d.' + scope.root)
							+ (d.children ? '' : ': ' + format(d.value));
				}
			}, scope);
};

PackChart.prototype.setCategory = function(cat) {
	this.root = cat;
};

PackChart.prototype.renderTo = function(parentDivId) {
	this.parentDiv = parentDivId;
	this.height = parseInt(document.getElementById(parentDivId).style.height);
	this.width = parseInt(document.getElementById(parentDivId).style.width);
	this.vis = d3.select('#' + this.parentDiv).append('svg')
				.attr("viewBox", "0 0 " + this.width + " " + this.height)
			    .attr("preserveAspectRatio", "none")
				.attr('width', '100%')
				.attr('height', '100%')
				.attr('class', 'pack')
				.append('g')
				.attr('transform', 'translate(2, 2)');
};

PackChart.prototype.printLegend = function(root, vis) {
	var nextSib = root.nextSibling;
	do {
		if (nextSib.attributes.getNamedItem('class').nodeValue == 'leaf node') {
			var data = nextSib.__data__;
			this.updateParentNodeEntry(data.parent, data.value);
		}
		nextSib = nextSib.nextSibling;
	} while (nextSib != null);
	
	this.printLegendMapEntries();
	while (this.legendMap.size > 1) {
		this.updateLegendMapEntries();
		this.printLegendMapEntries();
	}
};

PackChart.prototype.updateParentNodeEntry = function(parentNode, childNodeValue) {
	var temp1, temp2 = eval('parentNode.' + this.root);
	for ( var i = 0; i++ < this.legendMap.size; this.legendMap.next()) {
		var node = this.legendMap.key();
		temp1 = eval('node.' + this.root);
		if (temp1 == temp2) {
			var val = this.legendMap.value();
			val = val + childNodeValue;
			this.legendMap.put(node, val);
			return;
		}
	}
	this.legendMap.put(parentNode, childNodeValue);
};

PackChart.prototype.printLegendMapEntries = function() {
	for ( var i = 0; i++ < this.legendMap.size; this.legendMap.next()) {
		var d1 = this.legendMap.key();
		var val = this.legendMap.value();

		this.vis.append("text").attr('text-anchor', 'middle').attr("x", d1.x)
				.attr("y", d1.y - d1.r + 15).text(
						eval('d1.' + this.root) + ' : ' + val);
	}

};

PackChart.prototype.updateLegendMapEntries = function() {

	var tempMap = Map.from(this.legendMap), scope = this;
	var keysToRemove = new Array();

	for ( var i = 0; i++ < tempMap.size; tempMap.next()) {
		var key = tempMap.key();
		//var val = tempMap.value();
		this.updateParentNodeEntry(key.parent, key.value);
		keysToRemove.push(key);
	}
	keysToRemove.forEach(function(key) {
		scope.legendMap.remove(key);
	});
};

PackChart.prototype.loadPackChartForParam = function(param) {

	var scope = this;
	var pack = new Pack(this.width, this.height, param).getPackForParam();
	var node = this.vis.data([ scope.jsonString ]).selectAll('g.node')
				   .data(pack.nodes).enter().append('g')
				   .attr('class', function(d) {
					   return d.children ? 'node' : 'leaf node';
				   })
				   .on("click", function(d) {
						$(".tipsy").remove();
						scope.fireEvent(scope, 'onClick', d);
				   }).attr('transform', function(d) {
					   return 'translate(' + d.x + ',' + d.y + ')';
				   });

	node.append('circle').attr('class', 'pack-circle').attr('r', function(d) {
		return d.r;
	});

	node.filter(function(d) {
		return !d.children;
	}).append('text').attr('text-anchor', 'middle').attr('dy', '.3em').text(
			function(d) {
				if (!d.children) {
					var value = eval('d.' + scope.root);
					return value.substring(0, d.r / 3);
				}
				return "";
			});

	scope.getToolTip(param);
	scope.printLegend(node[0].parentNode.firstChild, this.vis);
};

PackChart.prototype.load = function(queryString) {
	var scope = this;
	
	d3.json(queryString, function(json) {
		scope.jsonString = json;
		var i = 0, str = null, tempStr = 'json.children', obj;
		for (str = tempStr; eval(tempStr) != undefined; tempStr = tempStr + '[0].children') {
			str = tempStr;
		}
		obj = eval(str + '[0]');
		for ( var attr in obj) {
			if (attr != scope.root)
				scope.parameters[i++] = attr;
		};
		if (scope.parameters[0])
			scope.loadPackChartForParam(scope.parameters[0]);
	}, scope);
};

Pack = function(w, h, p) {
	return {
		getPackForParam : function() {
			return d3.layout.pack().size([ w - 4, h - 4 ]).value(function(d) {
				return eval('d.' + p);
			});
		}
	};
};