/**
 * @class Its.tab.plugin.Tool
 * @extends Ext.AbstractPlugin
 * @ptype itstabtool
 * @version 1.0
 * @author Nguyen Truong Sinh (vietits@yahoo.com)
 *
 * Add a toolbar before or after the tab bar.
 * 
 *    @example
 *
 *    Ext.create('Ext.tab.Panel', {
 *        ...
 *        plugins: [{
 *            ptype : 'itstabtool',
 *            position: 'before',
 *            items : [{
 *                xtype: 'button',
 *                iconCls: 'icon-timer'
 *            },{
 *                xtype: 'button',
 *                iconCls: 'icon-reload'
 *            }]
 *        }],
 *        ...
 *     });
 *
 * @update 2012-01-28 09:48:12
 *  Release version 1.0
 * @update 2012-02-15 10:48:04
 *  Release version 1.1 with the following fixes
 *  - Fix the bug of appearing border around tabbar when resizing plain tabpanel
 */
Ext.define('Its.tab.plugin.Tool', {
    extend: 'Ext.AbstractPlugin',
    alias : 'plugin.itstabtool',
    /**
     * @cfg {String} position The position of toolbar in relation to the tabbar.  
   * It can be 'before' or 'after'.
     * Default to: 'after'
   */
    /**
     * @cfg {Object/Object[]} items
     * A single item, or an array of child Components to be added to this toolbar
   */
  init: function(tab) {
    var me  = this;
    var lst = me.items;
    if(lst) {
      var bar = tab.getTabBar();
      
      bar.flex = 1;
      if(bar.plain){
        bar.on({
          resize: function(){
            bar.setUI(me.ui + '-plain');
          }
        });
      }
      lst = Ext.isArray(lst) ? lst : [lst];
      tab.removeDocked(bar, false);
      tab.addDocked({
        xtype: 'toolbar',
        dock : bar.dock || 'top',
        items: me.position == 'before' ? lst.concat(bar) : [bar].concat(lst)
      });
    }
  }
});

/*
Ext.define('Indigo.data.Store', {
  override: 'Ext.data.Store',


  getSum: function(records, field) {
        var total = 0,
            i = 0,
            fieldValue,
            len = records.length;

        for (; i < len; ++i) {
        	fieldValue = records[i].get(field) ;
        	console.log(fieldValue);
        	if(!fieldValue || fieldValue == '-') {
        		fieldValue = 0 ;
        	}
        	//fieldValue = parseFloat(fieldValue.replace(new RegExp(",","gm"),""));
    		total += fieldValue;
    		if(total == NaN || total == undefined){
    			total = 0 ;
    		} 
      }
      return total;
    }

});
*/

Ext.define('Indigo.view.Table', {
  override: 'Ext.view.Table',
  
  hasActiveGrouping: function () {
    return this.isGrouping && this.store.isGrouped();
  },

  getRecord: function (node) {
    var me = this,
    record,
    recordIndex;
  
    // If store.destroyStore has been called before some delayed event fires on a node, we must ignore the event.
    if (me.store.isDestroyed) {
      return;
    }

    node = me.getNode(node);
    if (node) {
      // If we're grouping, the indexes may be off
      // because of collapsed groups, so just grab it by id
      if (!me.hasActiveGrouping()) {
        recordIndex = node.getAttribute('data-recordIndex');
        if (recordIndex) {
          recordIndex = parseInt(recordIndex, 10);
          if (recordIndex > -1) {
        // The index is the index in the original Store, not in a GroupStore
        // The Grouping Feature increments the index to skip over unrendered records in collapsed groups
            return me.store.data.getAt(recordIndex);
          }
        }
      }
      record = me.store.getByInternalId(node.getAttribute('data-recordId'));

      if (!record) {
        record = this.dataSource.data.get(node.getAttribute('data-recordId'));
      }

      return record;
    }
  },

  indexInStore: function (node) {
    node = node.isCollapsedPlaceholder ? this.getNode(node) : this.getNode(node, false);
    if (!node && node !== 0) {
      return -1;
    }
    var recordIndex = node.getAttribute('data-recordIndex');
    if (recordIndex) {
      return parseInt(recordIndex, 10);
    }
      return this.dataSource.indexOf(this.getRecord(node));
    }
});


Ext.define('Indigo.grid.feature.GroupStore', {
  override: 'Ext.grid.feature.GroupStore',

	processStore: function(store) {
        var me = this,
            Model = store.model,
            groups = store.getGroups(),
            groupCount = groups.length,
            i,
            group,
            groupers = store.groupers,
            groupPlaceholder,
            data = me.data,
            oldGroupCache = this.groupingFeature.groupCache,
            groupCache = this.groupingFeature.groupCache = {},
            collapseAll = me.groupingFeature.startCollapsed ;
        

        if (data) {
            data.clear();
        } else {
            data = me.data = new Ext.util.MixedCollection(false, Ext.data.Store.recordIdFn);
        }

        for (i = 0; i < groupCount; i++) {

            group = groups[i];
            
            groupCache[group.name] = group;
            if(!oldGroupCache[group.name] ){
            	group.isCollapsed = collapseAll ;
            }else {
            	group.isCollapsed = oldGroupCache[group.name].isCollapsed ;
            }
            
            //here we may add the extract cache
            if(groupers && groupers.length > 1){
            	me.processCache(store,group.children,groupCache,oldGroupCache,1,group.name,data,!group.isCollapsed) ;
            }
            
            if (group.isCollapsed && groupers.length > 0) {
                group.placeholder = groupPlaceholder = new Model(null, 'group-' + group.name + '-placeholder');
                groupPlaceholder.set(groupers.first().property, group.name);
                groupPlaceholder.rows = groupPlaceholder.children = group.children;
                data.add(groupPlaceholder);
            }else {
            	if(!groupers || groupers.length <= 1){
            		data.insert(me.data.length, group.children);
            	}
            }
        }
    },
    
    processCache : function(store,records,cache,oldGroupCache,depth,path,data,parentExpanded){
    	var me = this,
    		i,group,groupPlaceholder,
    		groupers = store.groupers,
    		collapseAll = me.groupingFeature.startCollapsed,
    		groups,children,
    		groupName,
    		isCollapsed,
    		Model = store.model,
        	count = groupers.getCount() ;
    	
    	if(depth < count){ 
    		groups = store.getGroupsForGrouperIndex(records,depth) ;
    		
    		for(i=0; i<groups.length; i++){
    			groupName = path.concat('-',groups[i].name) ;
    			children = groups[i].records ;
    			
    			if(!oldGroupCache[groupName] ){
    				isCollapsed = collapseAll ;
	            }else {
	            	isCollapsed = oldGroupCache[groupName].isCollapsed ;
	            }
    			
    			//isCollapsed =  collapseAll || (oldGroupCache[groupName] && oldGroupCache[groupName].isCollapsed) ;
    			group = cache[groupName] = {
					name: groupName,
                    children: children,
                    isCollapsed: isCollapsed,
                    depth:depth
    			};
    			
    			if(parentExpanded && isCollapsed){
					group.placeholder = groupPlaceholder = new Model(null, 'group-' + group.name + '-placeholder');
					for(var j=0;j<count;j++){
						 // hold all level places
						 groupPlaceholder.set(groupers.getAt(j).property,children[0].get(groupers.getAt(j).property));
					}
	                groupPlaceholder.rows = groupPlaceholder.children = children;
	                data.add(groupPlaceholder);
				}
    			
    			if(depth == count-1){
    				//the last level
    				if(parentExpanded && !isCollapsed){
    					data.insert(me.data.length,children);
    				}
    			}else {
    				cache = this.processCache(store,groups[i].records,cache,oldGroupCache,depth+1,groupName,data,parentExpanded && !isCollapsed);
    			}
    			
    		}
    	}
    	return cache ;
    }
});

Ext.define('Indigo.ux.grid.filter.DateTimeFilter', {
  override: 'Ext.ux.grid.filter.DateTimeFilter',
  
  onMenuSelect: function (picker, date) {
    // NOTE: we need to redefine the picker.
    var me = this,
        menu = me.menu,
        fields = me.fields,
        field;

    if (me.dock) {
        // If there is a dock config then the button will trigger the menu select.
        // In these cases, the picker function arg isn't actually a picker but the
        // button that was clicked, so redefine the picker.
        //
        // The focusEl is going to be the check item.
        picker = menu.getFocusEl().down('datepicker');
    }

    field = me.fields[picker.itemId];
    field.setChecked(true);
    
    me.values[picker.itemId] = me.addTimeSelection(picker.value, menu.getFocusEl().down('timepicker'));

    if (field == fields.on) {
        fields.before.setChecked(false, true);
        fields.after.setChecked(false, true);
    } else {
        fields.on.setChecked(false, true);
        if (field == fields.after && me.getFieldValue('before') < date) {
            fields.before.setChecked(false, true);
        } else if (field == fields.before && me.getFieldValue('after') > date) {
            fields.after.setChecked(false, true);
        }   
    }   
    me.fireEvent('update', me);

    // The timepicker's getBubbleTarget() returns the boundlist's implementation,
    // so it doesn't look up ownerCt chain (it looks up this.pickerField).
    // This is a problem :)
    // This can be fixed by just walking up the ownerCt chain
    // (same thing, but confusing without comment).
    picker.ownerCt.ownerCt.hide();
  },

  getSerialArgs: function () {
    var me = this,
        key,
        fields = me.fields,
        args = [],
        date = Ext.apply(me.dateDefaults, me.date || {}),
        time = Ext.apply(me.timeDefaults, me.time || {});

    for (key in fields) {
        if (fields[key].checked) {
            args.push({
                type: 'date', // datetime
                comparison: me.compareMap[key],
                value: Ext.Date.format(me.getFieldValue(key), 'c') // date.format + ' ' + time.format
            });
        }
    }
    return args;
  }
});

Ext.define('Indigo.form.field.Date', {
  override: 'Ext.form.field.Date',
  
  initComponent: function() {
    this.format =  this.timeFormat ?  this.format + ' ' + this.timeFormat : this.format;
    this.callParent();
  },
  
 getErrors: function(q) {
    var j = this, p = Ext.String.format, k = Ext.Date.clearTime, o = j.callSuper(arguments), n = j.disabledDays, d = j.disabledDatesRE, m = j.minValue, h = j.maxValue, g = n ? n.length : 0, e = 0, a, b, l, c;
    q = j.formatDate(q || j.processRawValue(j.getRawValue()));
    if (q === null || q.length < 1) {
        return o;
    }
    a = q;
    q = j.parseDate(q);
    if (!q) {
        o.push(p(j.invalidText, a, Ext.Date.unescapeFormat(j.format)));
        return o;
    }
    c = q.getTime();
    if (this.timeFormat) {
      if (m && c < m) {
          o.push(p(j.minText, j.formatDate(m)));
      }
      if (h && c > h) {
          o.push(p(j.maxText, j.formatDate(h)));
      }
    } else {
      if (m && c < k(m).getTime()) {
        o.push(p(j.minText, j.formatDate(m)));
      }
      if (h && c > k(h).getTime()) {
          o.push(p(j.maxText, j.formatDate(h)));
      }
    }
    if (n) {
        l = q.getDay();
        for (; e < g; e++) {
            if (l === n[e]) {
                o.push(j.disabledDaysText);
                break;
            }
        }
    }
    b = j.formatDate(q);
    if (d && d.test(b)) {
        o.push(p(j.disabledDatesText, b));
    }
    return o;
}
});