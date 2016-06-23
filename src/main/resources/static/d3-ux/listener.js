//Defines the top level Class
function Class() { }
Class.prototype.construct = function() {};
Class.extend = function(def) {
    var classDef = function() {
        if (arguments[0] !== Class) { this.construct.apply(this, arguments); }
    };
    
    var proto = new this(Class);
    var superClass = this.prototype;
    
    for (var n in def) {
        var item = def[n];                        
        if (item instanceof Function) item.$ = superClass;
        proto[n] = item;
    }

    classDef.prototype = proto;
    
    //Give this new class the same static extend method    
    classDef.extend = this.extend;        
    return classDef;
};

var Listenable = Class.extend({
	
    construct: function() {
       this.eventList = [];
    },
	      fireEvent : function(obj,evt,args) {
	    		var e=0;
	    		if(!e){e = window.event;}

	    		if(obj && this.eventList)
	    		{
	    			var evtel = this.eventList[obj];
	    			if(evtel)
	    			{
	    				var curel = evtel[evt];
	    		        if(curel)
	    				{
	    					for(var act in curel)
	    					{
	    						var action = curel[act].action;
	    						if(curel[act].binding)
	    						{
	    							action = action.bind(curel[act].binding);
	    						}
	    						if(action!=undefined){
	    							action(e,args);
	    						}
	    						
	    					};
	    				};
	    			};
	    		}; 
	    	 },
	         addListener: function(obj,evt,action,binding) {
	        	 	if(this.eventList && this.eventList[obj])
	        		{
	        			if(this.eventList[obj][evt])
	        			{
	        				if(this.getActionIdx(obj,evt,action,binding) == -1)
	        				{
	        					var curevt = this.eventList[obj][evt];
	        					curevt[curevt.length] = {action:action,binding:binding};
	        				}
	        			}
	        			else
	        			{
	        				this.eventList[obj][evt] = [];
	        				this.eventList[obj][evt][0] = {action:action,binding:binding};
	        			}
	        		}
	        		else
	        		{
	        			if(this.eventList == undefined) this.eventList = [];
	        			this.eventList[obj] = [];
	        			this.eventList[obj][evt] = [];
	        			this.eventList[obj][evt][0] = {action:action,binding:binding};
	        		}
	        	},
	        	getActionIdx: function(obj,evt,action,binding) {
	        	 	if(obj && evt)
	        	 	{

	        	 		var curel = this.eventList[obj][evt];
	        	 		if(curel)
	        	 		{
	        	 			var len = curel.length;
	        	 			for(var i = len-1;i >= 0;i--)
	        	 			{
	        	 				if(curel[i].action == action && curel[i].binding == binding)
	        	 				{
	        	 					return i;
	        	 				}
	        	 			}
	        	 		}
	        	 		else
	        	 		{
	        	 			return -1;
	        	 		}
	        	 	}
	        	 	return -1;
	        	 }
});
