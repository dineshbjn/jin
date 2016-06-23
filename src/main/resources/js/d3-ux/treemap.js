var TreemapChart = Listenable.extend ({	
	  construct: function() {
			this.color = d3.scale.category20c();
			this.childrenTypeToColor = d3.map();
			this.parameters = new Array();
	    }
});

TreemapChart.prototype.setValidLegendsList = function(list){
    	this.validLegendsList = list;
};

TreemapChart.prototype.renderTo = function(parentDivId){
	
	this.parentDiv = parentDivId;
	this.height = parseInt(document.getElementById(this.parentDiv).style.height) - 50;
	this.width = parseInt(document.getElementById(this.parentDiv).style.width) - 500;
	var margin = this.width + 50;
	
	this.div = d3.select("#"+this.parentDiv).append("div")
    .attr('class','treemap_panel')
    .style('position','absolute')
    .style('overflow','hidden')
    .style('top', '10px')
    .style("width", this.width + "px")
    .style("height", this.height + "px")
    .style('left', '0');

	this.htmlDiv = d3.select("#"+this.parentDiv).append("div")
    .attr('class','treemap_table')
    .style('position','absolute')
    .style('overflow','auto')
    .style('left', margin + "px")
    .style('top', '10px')
    .style("width", 400 + "px")
    .style("height", 300 + "px");
};

TreemapChart.prototype.loadTreemapForParam = function(param){

    		var scope = this, type, colour;
    		treemap = new Treemap(this.width, this.height, param).getTreemapForParam();

    	    this.div.data([this.jsonString]).selectAll('div')
    	        	.data(treemap.nodes)
    	           	.enter().append('div')
    	           	.attr('class', 'treemap-cell')
    	            .on("click", function(d) { 
    	            	// Clears any tooltip being displayed on screen before loading a new page
	    	            	$(".tipsy").remove();
	    	            	scope.fireEvent(scope, 'onClick', d); 
                     })
    	            .style('background', function(d) { 
    	         	  	if(d.children) {
    					     type = eval('d.' + scope.root);  
    					     colour = scope.color(type);	
    					     scope.fillLegendMap(type, colour); //Filling the color map while render background color to avoid repeated iteration.
    					     return colour;
    	         	    }
    	         	  	else return null;
    	             })
	    	         .call(cell)
	    	         .text(function(d) { return d.children ? null : eval('d.'+scope.root);});
    	         
		   this.currentElement = param;	
    	   this.subscribeForTooltip();
    	   this.displayTable(this.childrenTypeToColor);
};


TreemapChart.prototype.setCategoryType = function(str){
    		this.root = str;
};

TreemapChart.prototype.fillLegendMap = function(type, colour){
	if(this.validLegendsList.indexOf(type)>-1){this.childrenTypeToColor.set(type, colour);};
};

TreemapChart.prototype.load  = function(queryString){

    		var scope = this;
    		d3.json(queryString, function(json) {
    			 scope.jsonString = json;
    			 var i = 0, str = 0, tempStr = 'json.children', obj;
    			 for(str = tempStr; eval(tempStr)!=undefined ; tempStr = tempStr + '[0].children'){
    				  str = tempStr;
    			 }
    			 
    			 obj = eval(str + '[0]');
    			 i=0;
    			 for(var attr in obj){
    				 if(attr!=scope.root)
    					 scope.parameters[i++] = attr; 
    			 };
    			 
    	   		 if(scope.parameters[0])
    	    		   scope.loadTreemapForParam(scope.parameters[0]);
			 	
    		 });
};

TreemapChart.prototype.displayTable = function() {
		    
		  	  var scope = this;
			  var htmlString='', tableString = '<br/><br/><table border="2"><tr><th>Color</th><th>UserType</th></tr>';
			  this.parameters.forEach(function(p){
				  if(htmlString=='')
					  htmlString+='<input id='+ p +' type="radio" name="param" value='+ p +' checked="checked"><label for='+ p +'>'+ p +'</label><br/>';
			      else
			    	  htmlString+='<input id='+ p +' type="radio" name="param" value='+ p +'><label for='+ p +'>'+ p +'</label><br/>';
			  });
			  
			  htmlString+=tableString;

			  this.childrenTypeToColor.forEach(function(key, value){
			      	if(key!=this.root)
			      	   htmlString+='<tr><td bgcolor='+value+'></td><td>'+key+'</td></tr>';
		           });
			  htmlString = htmlString+'</table>';

			  $('.treemap_table').append(htmlString);
			   d3.selectAll("input[name=param]").on("change", function() {
				     var val = this.value;
				     scope.div.selectAll("div")
				        .data(treemap.value(function(d) { return eval('d.'+val); }))
				        .transition()
				        .duration(1500)
				        .call(cell);
		
				     scope.currentElement = val;
			  });  
};

TreemapChart.prototype.subscribeForTooltip = function(){
       		var scope = this;
	         $('.treemap-cell').tipsy({ 
	        	   gravity: 'w', 
	        	   html: true, 
	               title: function() {
	               var d = this.__data__;
	               return d.children ? '' : eval('d.'+ scope.root) +' : '+ eval('d.'+scope.currentElement);
	             }
	         });
};


Treemap = function(w, h, p) {
	return {
		getTreemapForParam : function() {
			var t = d3.layout.treemap()
			          .size([w, h])
			          .sticky(true)
			          .value(function(d) { return eval('d.'+p); });
			return t;
		}
	};
};

function cell() {
    this
      .style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
}