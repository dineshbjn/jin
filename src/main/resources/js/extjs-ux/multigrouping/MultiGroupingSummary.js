/**
 * This feature adds an aggregate summary row at the bottom of each group that is provided
 * by the {@link Ext.grid.feature.Grouping} feature. There are two aspects to the summary:
 *
 * ## Calculation
 *
 * The summary value needs to be calculated for each column in the grid. This is controlled
 * by the summaryType option specified on the column. There are several built in summary types,
 * which can be specified as a string on the column configuration. These call underlying methods
 * on the store:
 *
 *  - {@link Ext.data.Store#count count}
 *  - {@link Ext.data.Store#sum sum}
 *  - {@link Ext.data.Store#min min}
 *  - {@link Ext.data.Store#max max}
 *  - {@link Ext.data.Store#average average}
 *
 * Alternatively, the summaryType can be a function definition. If this is the case,
 * the function is called with an array of records to calculate the summary value.
 *
 * ## Rendering
 *
 * Similar to a column, the summary also supports a summaryRenderer function. This
 * summaryRenderer is called before displaying a value. The function is optional, if
 * not specified the default calculated value is shown. The summaryRenderer is called with:
 *
 *  - value {Object} - The calculated value.
 *  - summaryData {Object} - Contains all raw summary values for the row.
 *  - field {String} - The name of the field we are calculating
 *
 * ## Example Usage
 *
 *     @example
 *     Ext.define('TestResult', {
 *         extend: 'Ext.data.Model',
 *         fields: ['student', 'subject', {
 *             name: 'mark',
 *             type: 'int'
 *         }]
 *     });
 *
 *     Ext.create('Ext.grid.Panel', {
 *         width: 200,
 *         height: 240,
 *         renderTo: document.body,
 *         features: [{
 *             groupHeaderTpl: 'Subject: {name}',
 *             ftype: 'groupingsummary'
 *         }],
 *         store: {
 *             model: 'TestResult',
 *             groupField: 'subject',
 *             data: [{
 *                 student: 'Student 1',
 *                 subject: 'Math',
 *                 mark: 84
 *             },{
 *                 student: 'Student 1',
 *                 subject: 'Science',
 *                 mark: 72
 *             },{
 *                 student: 'Student 2',
 *                 subject: 'Math',
 *                 mark: 96
 *             },{
 *                 student: 'Student 2',
 *                 subject: 'Science',
 *                 mark: 68
 *             }]
 *         },
 *         columns: [{
 *             dataIndex: 'student',
 *             text: 'Name',
 *             summaryType: 'count',
 *             summaryRenderer: function(value){
 *                 return Ext.String.format('{0} student{1}', value, value !== 1 ? 's' : '');
 *             }
 *         }, {
 *             dataIndex: 'mark',
 *             text: 'Mark',
 *             summaryType: 'average'
 *         }]
 *     });
 */
 
 
 
 
 /**
 * GroupingSummary with TotalRow for Ext 4.0.7
 *
 * @author Mcaveti
 * @version 0.5
 * For Ext 4.0.7
 * 
 * This Extension adds a total summary row at the bottom of the view or at the last group
 * and adds a new property for the columns and GroupingSummary class.
 *
 * ## Example Usage
 *
 *  features: [
 *      {
 *          ftype: 'groupingsummary',       // this for example - not new property
 *          totalSummary: 'fixed',          // Can be: 'fixed', true, false. Default: false
 *          totalSummaryTopLine: true,      // Default: true
 *          totalSummaryColumnLines: true,  // Default: false
 *      }
 *  ]
 *
 *  columns: [
 *      {
 *          totalSummaryType: 'sum',        // Can be any summaryType. Default: summaryType
 *          totalSummaryText: 'Total:',     // Can be any text or Html
 *          summaryText: 'Total of group:', // Can be any text or Html
 *      }
 *  ]
 */
 
 
 
 
Ext.define('Ext.ux.grid.feature.MultiGroupingSummary', {

    /* Begin Definitions */

    extend: 'Ext.ux.grid.feature.MultiGrouping',
    
    alias: 'feature.multigroupingsummary',

    mixins: {
        summary: 'Ext.grid.feature.AbstractSummary'
    },

    /* End Definitions */

    init: function() {
    	this.callParent(arguments);
        this.mixins.summary.init.call(this);
    },


    getPrintTotalData: function () { // new method for this class
        var me = this,
            columns = me.view.headerCt.getColumnsForTpl(),
            i = 0,
            length = columns.length,
            data = [],
            active = me.TotalSummaryData,
            column;

        for (; i < length; ++i) {
            column = columns[i];
            column.gridSummaryValue = this.getColumnValue(column, active);
            data.push(column);
        }
        return data;
    },
        

    generateTotalSummaryData: function () { // new method for this class
        var me = this,
            data = {},
            store = me.view.store,
            columns = me.view.headerCt.getColumnsForTpl(),
            i = 0,
            length = columns.length,
            fieldData, key, comp;

        for (i = 0, length = columns.length; i < length; ++i) {
            comp = Ext.getCmp(columns[i].id);
            data[comp.id] = comp.totalSummaryText ? comp.totalSummaryText : me.getSummary(store, (comp.totalSummaryType ? comp.totalSummaryType : comp.summaryType), comp.dataIndex, false);
        }
        return data;
    },
    
    generateSummaryData: function(){
        var me = this,
            store = me.view.store,
            groups = store.groups.items,
            reader = store.proxy.reader,
            len = groups.length,
            groupField = me.getGroupField(),
            data = {},
            lockingPartner = me.lockingPartner,
            i, group, record,
            root, summaryRows, hasRemote,
            convertedSummaryRow, remoteData;
            
        
        if (me.remoteRoot && reader.rawData) {
            hasRemote = true;
            remoteData = {};
            
            root = reader.root;
            reader.root = me.remoteRoot;
            reader.buildExtractors(true);
            summaryRows = reader.getRoot(reader.rawData);
            len = summaryRows.length;

            
            if (!reader.convertRecordData) {
                reader.buildExtractors();
            }

            for (i = 0; i < len; ++i) {
                convertedSummaryRow = {};

                
                reader.convertRecordData(convertedSummaryRow, summaryRows[i]);
                remoteData[convertedSummaryRow[groupField]] = convertedSummaryRow;
            }

            
            reader.root = root;
            reader.buildExtractors(true);
        }
        
        this.processData(groups, data, hasRemote, remoteData,0);
        
        return data;
    },
    

    processData : function(groups, data, hasRemote, remoteData,depth) {
		var me = this, 
		store = me.view.store, // Swami: Oct 16, 2013 (fix for store)
		lockingPartner = me.lockingPartner, 
		record,i,c,
		child, childGroups, childGroup,
		len = groups.length, 
		groupers = me.view.store.groupers,
		count = groupers.getCount();
	
		for (i = 0; i < len; ++i) {
			group = groups[i];
	
			if (hasRemote || group.isDirty()
					|| !group.hasAggregate()) {
				if (hasRemote) {
					record = me.populateRemoteRecord(group,
							remoteData);
				} else {
					record = me.populateRecord(group);
				}
	
				if (!lockingPartner
						|| (me.view.ownerCt === me.view.ownerCt.ownerLockable.normalGrid)) {
					group.commit();
				}
			} else {
				record = group.getAggregateRecord();
				if (lockingPartner && !record.hasPartnerData) {
					me.populateRecord(group);
					record.hasPartnerData = true;
				}
			}
			data[group.key] = record;
	
			if (depth < count-1) {
				childGroups = [];
				
				var tempGroups = store.getGroupsForGrouperIndex(group.records,depth+1) ;
				for(c=0; c<tempGroups.length; c++){
					child = tempGroups[c];
					childGroup = new Ext.data.Group({
						key : group.key.concat('-',child.name),
						store : me.view.store
					});
					childGroup.add(child.records);
					childGroups.push(childGroup);
				}
				data = this.processData(childGroups, data, hasRemote, remoteData,depth+1);
			}
		}
	
		return data;
	
	}

   
});
