Ext.require([ 'Ext.window.MessageBox', 'Ext.tip.*' ]);
var params = Ext.urlDecode(location.search.substring(1));
var host = location.hostname;
var port = location.port;
var dotted = false;
var methods = false;
var write = false;
var cluster = false;
var dev = false;
var delay = 1000;
if (params.host) {
	host = params.host;
}
if (params.port) {
	port = params.port;
}
if (params.dotted) {
	dotted = /^true$/i.test(params.dotted);
}
if (params.methods) {
	methods = /^true$/i.test(params.methods);
}
if (params.write) {
	write = /^true$/i.test(params.write);
}
if (params.cluster) {
	cluster = /^true$/i.test(params.cluster);
}
if (params.dev) {
	dev = /^true$/i.test(params.dev);
}
if (params.delay) {
	delay = parseInt(params.delay);
}
if (dev) {
	dotted = true;
	methods = true;
	write = true;
	cluster = true;
}
var currLocation = location.toString();
var hostPrefix = currLocation.substring(0, currLocation.split('://')[0].length + currLocation.split('://')[1].lastIndexOf('/') + 4);
document.title = 'JIN - ' + 'Java Inspector' + ' - ' + host;
var idCounter = 0;
var leafTypes = [ "java.lang.String", "java.lang.Double", "java.lang.Float",
		"java.lang.Integer", "java.util.concurrent.atomic.AtomicInteger",
		"java.lang.Long", "java.util.concurrent.atomic.AtomicLong",
		"java.lang.Boolean", "java.util.concurrent.atomic.AtomicBoolean",
		"java.lang.Short", "java.lang.Byte", "java.lang.Character",
		"java.lang.Void", "java.util.Date", "java.sql.Date",
		"java.util.Calendar", "int", "long", "float", "byte", "double",
		"short", "boolean", "char", "void" ];

Ext.QuickTips.init();
Ext.Ajax.useDefaultXhrHeader = false;
Ext.Ajax.cors = true;
Ext.Ajax.disableCaching = false;

var store = Ext.create('Ext.data.TreeStore', {
	root : {},

	listeners : {
		expand : function(node, eOpts) {
			if (node.isRoot())
				return;
			if (node.raw.expanded)
				return;
			var path = node.raw.uri;
			getObject(path, {
				className : node.raw.type.substring(node.raw.type
						.lastIndexOf(".") + 1)
			}, function(obj) {
				node.appendChild(obj);
			});
			node.raw['expanded'] = true;
		}
	}
});

var clusterList = [ host + ':' + port ];
var clusterValues = {};

var treePanelCurrentNode = null;
var treePanel = Ext
		.create(
				'Ext.tree.Panel',
				{
					store : store,
					rootVisible : false,
					listeners : {
						itemdblclick : function(panel, node) {
							var fieldId = 'mfield' + idCounter++;
							if (node.data.leaf && !node.raw.monitored) {
								var value = getData(hostPrefix + node.raw.uri);
								var displayText = node.raw.uri.substring(
										node.raw.uri.lastIndexOf('~~') + 2,
										node.raw.uri.length);
								objectPanel
										.add([
												{
													xtype : 'textfield',
													text : 'min',
													id : 'min' + fieldId,
													width : 50,
													margin : 5
												},
												{
													xtype : 'textfield',
													id : 'max' + fieldId,
													width : 50,
													margin : 5
												},
												{
													xtype : 'label',
													text : displayText,
													style : 'font: normal 22px arial',
													margin : 5
												},
												{
													xtype : 'label',
													text : value,
													uri : node.raw.uri,
													id : fieldId,
													style : 'font: normal 30px arial;width:200px',
													padding : 10

												}, {
													xtype : 'button',
													iconCls : 'alert-critical',
													listeners : {}
												} ]

										);
								addSmoothieChart(node.raw.uri, displayText,
										hostPrefix + node.raw.uri);
								node.raw.monitored = true;
							}
						},
						itemclick : function(panel, node) {
							onNodeClick(node);
						},
						itemcontextmenu : function(panel, node, item, index,
								event) {
							var eventStop = false;
							if (node.data.leaf) {
								if (cluster) {
									try {
										var urls = [];
										for (var i = 0; i < clusterList.length; i++) {
											if (clusterList[i].indexOf(':') > 0) {
												urls.push('http://'
														+ clusterList[i] + '/'
														+ node.raw.uri);
											} else {
												for (var j = 0; j < 20; j++) {
													urls.push('http://'
															+ clusterList[i]
															+ ':' + (5678 + j)
															+ '/'
															+ node.raw.uri);
												}
											}
										}
										clusterValues[node.raw.uri] = {};
										clusterValues[node.raw.uri]['cnt'] = 0;
										clusterValues[node.raw.uri]['sum'] = 0;
										clusterValues[node.raw.uri]['min'] = Number.MAX_VALUE;
										clusterValues[node.raw.uri]['max'] = Number.MIN_VALUE;
										clusterValues[node.raw.uri]['avg'] = 0;
										var processCusterReq = function(val) {
											var numVal = parseFloat(val);
											if (!isNaN(numVal)) {
												clusterValues[node.raw.uri]['cnt']++;
												clusterValues[node.raw.uri]['sum'] += numVal;
												if (clusterValues[node.raw.uri]['min'] > numVal) {
													clusterValues[node.raw.uri]['min'] = numVal;
												}
												if (clusterValues[node.raw.uri]['max'] < numVal) {
													clusterValues[node.raw.uri]['max'] = numVal;
												}
												clusterValues[node.raw.uri]['avg'] = clusterValues[node.raw.uri]['sum']
														/ clusterValues[node.raw.uri]['cnt'];
												return numVal;
											} else {
												return 0;
											}
										}
										Promise
												.map(
														urls,
														function(url) {
															var urlVal = processCusterReq($
																	.ajax({
																		url : url,
																		async : false
																	}).responseText);
															if (urlVal != 0)
																console
																		.log(urlVal
																				+ ' -> '
																				+ url);
															return urlVal;
														})
												.then(
														function(results) {
															if (!write) {
																if (clusterValues[node.raw.uri]['cnt'] > 0)
																	Ext.Msg
																			.alert(
																					'Cluster value',
																					JSON
																							.stringify(clusterValues[node.raw.uri]));
															}
														});
										eventStop |= true;
									} catch (ex) {
										console.log(ex);
									}
								}
								if (write) {
									if (node.data.text.split(':')[0]
											.indexOf("()") == -1) {
										treePanelCurrentNode = node;
										var displayed = 'Update this field';
										if (cluster
												&& clusterValues[node.raw.uri]['cnt'] > 0) {
											displayed += ' (Cluster value: '
													+ JSON
															.stringify(clusterValues[node.raw.uri])
													+ ')';
										}
										Ext.MessageBox
												.prompt(
														displayed,
														'New value:',
														function(btn, text) {
															if (btn == 'ok') {
																getData(hostPrefix
																		+ treePanelCurrentNode.raw.uri
																		+ '~~'
																		+ text);
																onNodeClick(treePanelCurrentNode);
															}
														}, window, false,
														node.data.text
																.split(':')[1]
																.substring(1));
										eventStop |= true;
									} else {
										if (cluster) {
											if (clusterValues[node.raw.uri]['cnt'] > 0)
												Ext.Msg
														.alert(
																'Cluster value',
																JSON
																		.stringify(clusterValues[node.raw.uri]));
										}
									}
								}
							} else {
								if (node.raw.expanded) {
									if (node.data.text.startsWith("_")
											&& node.data.text.indexOf(":") == -1) {
										node.removeAll(true);
										getObject(
												node.raw.uri,
												{
													className : node.raw.type
															.substring(node.raw.type
																	.lastIndexOf(".") + 1)
												}, function(obj) {
													node.appendChild(obj);
												});
										eventStop |= true;
									}
								}
							}
							if (eventStop) {
								event.stopEvent();
							}
						}

					}

				});

function onNodeClick(node) {
	history.replaceState(null, null, "#" + node.raw.uri.substring(3));
	if (node.data.leaf) {
		var value = getData(hostPrefix + node.raw.uri);
		node.set("text", node.raw.text.split(":")[0] + ": " + value);
	}
}

var objectPanel = Ext.create("Ext.form.Panel", {
	layout : {
		type : 'table',
		columns : 5,
		padding : 20,
		tdAttrs : {
			style : 'padding: 10px;'
		}
	},
	padding : 10,
	border : false
});

var graphPanel = Ext.create("Ext.form.Panel", {
	layout : 'accordion',
	items : [],
	border : false
});

function getJins(count) {
	var jins = [];
	if (port == "")
		return jins;
	for (var i = 0; i < count; i++) {
		var currPort = 5678 + i;
		var prefix = 'http://' + host + ':' + currPort + '/';
		var title = '';
		try {
			title = getData(prefix + 'do/spring/title');
		} catch (err) {
			// nothing
		}
		if (title.length > 0) {
			jins.push({
				'title' : title + ' (' + currPort + ')',
				'url' : prefix + 'main'
			});
		}
	}
	return jins;
}

var jins = getJins(1);

var jinCombo = {
	xtype : 'combo',
	id : 'jinCombo',
	editable : false,
	width : 300,
	height : 22,
	margin : 5,
	queryMode : 'local',
	displayField : 'title',
	valueField : 'url',
	value : getData(hostPrefix + 'do/spring/title') + ' (' + port + ')',
	store : Ext.create('Ext.data.Store', {
		fields : [ 'title', 'url' ],
		data : jins
	}),
	listeners : {
		scope : this,
		change : function(me, newValue, oldValue, eOpts) {
			location.href = newValue + location.search + location.hash;
		}
	}
};

function getObject(path, meta, callback) {
	if (path.indexOf("_enumMapData") > 0) {
		var temp = [];
		var objPath = path.substring(0, path.indexOf("_enumMapData") - 2);
		var resp = getData(hostPrefix + objPath + "..keySet");
		var elements = resp.split('\n');

		for (var i = 0; i < elements.length && i < 100; i++) {
			var name = elements[i];
			getDataAsync(hostPrefix + objPath + "..getValue~~" + name
					+ "..getClass..getName", {
				name : name + "",
				objPath : objPath + ""
			}, function(resp, context) {
				var type = resp.responseText;
				if (type == "void")
					return;
				var isLeaf = Ext.Array.contains(leafTypes, type);
				if (context.name != '')
					callback({
						text : context.name + " : "
								+ type.indexOf('{"error":') == 0 ? '!Error' : type.substring(type.lastIndexOf(".") + 1),
						type : type.indexOf('{"error":') == 0 ? '!Error' : type,
						leaf : isLeaf,
						uri : context.objPath + "..getValue~~" + context.name,
						qtip : context.objPath.substring(context.objPath
								.indexOf("..") + 2)
								+ "..getValue~~" + context.name
					});
			});
		}
		return temp;
	}
	if (path.indexOf("_mapData") > 0) {
		var temp = [];
		var objPath = path.substring(0, path.indexOf("_mapData") - 2);
		var resp = getData(hostPrefix + objPath + "..keySet");
		var elements = resp.split('\n');

		for (var i = 0; i < elements.length && i < 100; i++) {
			var name = elements[i];
			getDataAsync(hostPrefix + objPath + ".." + name
					+ "..getClass..getName", {
				name : name + "",
				objPath : objPath + ""
			}, function(resp, context) {
				var type = resp.responseText;
				if (type == "void")
					return;
				var isLeaf = Ext.Array.contains(leafTypes, type);
				if (context.name != '')
					callback({
						text : context.name + " : "
								+ type.indexOf('{"error":') == 0 ? '!Error' : type.substring(type.lastIndexOf(".") + 1),
						type : type.indexOf('{"error":') == 0 ? '!Error' : type,
						leaf : isLeaf,
						uri : context.objPath + "..~" + context.name,
						qtip : context.objPath.substring(context.objPath
								.indexOf("..") + 2)
								+ "..~" + context.name
					});
			});
		}
		return temp;
	}
	if (path.indexOf("_listData") > 0) {
		var temp = [];
		var objPath = path.substring(0, path.indexOf("_listData") - 2);
		var size = parseInt(getData(hostPrefix + objPath + "..size"));
		for (var i = 0; i < size; i++) {
			var name = i;
			getDataAsync(hostPrefix + objPath + ".." + name, {
				name : name + "",
				objPath : objPath + ""
			}, function(resp, context) {
				var val = resp.responseText;
				if (val.indexOf("[no return value]") == 0 || val == ""
						|| val.indexOf('{"error"') >= 0)
					return;
				getDataAsync(hostPrefix + context.objPath + ".." + context.name
						+ "..getClass..getName", context, function(resp,
						context) {
					var type = resp.responseText;
					if (type == "void")
						return;
					var isLeaf = Ext.Array.contains(leafTypes, type);
					callback({
						text : context.name + " : "
								+ type.indexOf('{"error":') == 0 ? '!Error' : type.substring(type.lastIndexOf(".") + 1),
						type : type.indexOf('{"error":') == 0 ? '!Error' : type,
						leaf : isLeaf,
						uri : context.objPath + "..~" + context.name,
						qtip : context.objPath.substring(context.objPath
								.indexOf("..") + 2)
								+ "..~" + context.name
					});
				});
			});
		}
		return temp;
	}

	var isArray = getData(hostPrefix + path + "..getClass..isArray");

	var temp = [];

	if (isArray == "true") {
		var length = parseInt(getData(hostPrefix + path + ".._length"));
		for (var i = 0; i < length; i++) {
			var name = i;
			getDataAsync(hostPrefix + path + ".." + name, {
				name : name + "",
				path : path + ""
			}, function(resp, context) {
				var val = resp.responseText;
				if (val.indexOf("[no return value]") == 0 || val == "")
					return;
				getDataAsync(hostPrefix + context.path + ".." + context.name
						+ "..getClass..getName", context, function(resp,
						context) {
					var type = resp.responseText;
					var isLeaf = Ext.Array.contains(leafTypes, type);
					callback({
						text : context.name + " : "
								+ type.indexOf('{"error":') == 0 ? '!Error' : type.substring(type.lastIndexOf(".") + 1),
						type : type.indexOf('{"error":') == 0 ? '!Error' : type,
						leaf : isLeaf,
						uri : context.path + "..~" + context.name,
						qtip : context.path.substring(context.path
								.indexOf("..") + 2)
								+ "..~" + context.name
					});
				});
			});
		}

	} else {
		var allInterfaces = getData(hostPrefix + path + ".._interfaces");
		var interfaces = allInterfaces.split('\n');
		for (var i = 0; i < interfaces.length; i++) {
			if (interfaces[i].indexOf("java.util.Map") > 0) {
				var className = getData(hostPrefix + path
						+ "..getClass..getSimpleName");
				if (className == "EventCountMap") {
					callback({
						text : "_enumMapData",
						type : className,
						leaf : false,
						uri : path + ".._enumMapData"
					});
				} else {
					callback({
						text : "_mapData",
						type : className,
						leaf : false,
						uri : path + ".._mapData"
					});
				}
				break;
			}
			if (interfaces[i].indexOf("java.util.List") > 0) {
				callback({
					text : "_listData",
					type : "java.util.List",
					leaf : false,
					uri : path + ".._listData"
				});
				break;
			}
		}

		var resp = getData(hostPrefix + path + ".._fields");
		var elements = resp.split('\n');
		var fieldMap = {};
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var temparr = element.split(" ");
			var type = temparr[temparr.length - 2];
			var name = temparr[temparr.length - 1];
			name = name.substring(name.lastIndexOf(".") + 1);
			if (name in fieldMap) {
				continue;
			}
			fieldMap[name] = new Date();
			var isLeaf = Ext.Array.contains(leafTypes, type);
			if (name != '' && type != 'java.lang.reflect.Method')
				if (isLeaf) {
					getDataAsync(hostPrefix + path + "..$" + name, {
						name : name + "",
						path : path + "",
						isLeaf : isLeaf,
						type : type
					}, function(resp, context) {
						var val = resp.responseText;
						callback({
							text : context.name + " : " + val,
							type : context.type,
							leaf : context.isLeaf,
							uri : context.path + "..$" + context.name,
							qtip : context.path.substring(context.path
									.indexOf("..") + 2)
									+ "..$" + context.name
						});
					});
				} else {
					callback({
						text : name + " : "
								+ type.substring(type.lastIndexOf(".") + 1),
						type : type,
						leaf : isLeaf,
						uri : path + "..$" + name,
						qtip : path.substring(path.indexOf("..") + 2) + "..$"
								+ name
					});
				}
		}

		if (methods) {
			resp = getData(hostPrefix + path + ".._methods");
			elements = resp.split('\n');
		} else {
			if (meta.className.startsWith("$Proxy")
					|| meta.className.indexOf("CGLIB$$") > 0) {
				elements = [
						"public java.lang.String java.lang.Object.toString()",
						"public aop.TargetSource com.sun.proxy.Proxy.getTargetSource()" ];
			} else {
				elements = [ "public java.lang.String java.lang.Object.toString()" ];
			}
		}
		var methodMap = {};
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var temparr = element.split(" ");
			var type = temparr[temparr.length - 2];
			if (type == "void")
				continue;
			var name = temparr[temparr.length - 1];
			if (name.indexOf("java.lang.Object") == 0
					&& name.indexOf("java.lang.Object.toString") != 0)
				continue;
			if (name.indexOf("()") != name.length - 2)
				continue;
			name = name.substring(name.lastIndexOf(".") + 1);
			if (name in methodMap) {
				continue;
			}
			methodMap[name] = new Date();
			var isLeaf = Ext.Array.contains(leafTypes, type);
			if (name != '')
				callback({
					text : name + " : "
							+ type.substring(type.lastIndexOf(".") + 1),
					type : type,
					leaf : isLeaf,
					uri : path + ".." + name.substring(0, name.length - 2),
					qtip : path.substring(path.indexOf("..") + 2) + ".."
							+ name.substring(0, name.length - 2)
				});
		}
	}
	return temp;
}

function getDataAsync(url, context, callback) {
	Ext.Ajax.request({
		method : 'GET',
		async : true,
		context : context,
		url : url,
		success : function(conn, response, options, eOpts) {
			callback(conn, response.context);
		}
	});
}

function getData(url) {
	var resp = Ext.Ajax.request({
		method : 'GET',
		async : false,
		url : url
	});

	resp = resp.responseText;
	if (resp.indexOf('{"error"') == 0) {
		return "";
	}

	return resp;
}

function expandChildWithUri(node, uri) {
	if (node == null) {
		return;
	}
	node.expand();
	// uri = uri.substring(uri.indexOf('~~') + 1);
	for (var i = 0; i < node.childNodes.length; i++) {
		if (node.childNodes[i].raw.text.startsWith('_')
				&& (uri.indexOf('..~') > 0 || uri.indexOf('getValue~~') > 0)) {
			node.childNodes[i].expand();
			return expandChildWithUri(node.childNodes[i], uri);
		}
		if (node.childNodes[i].raw.uri == uri) {
			if (node.childNodes[i].raw.leaf) {
				onNodeClick(node.childNodes[i]);
			} else {
				node.childNodes[i].expand();
			}
			return node.childNodes[i];
		}
	}
	return null;
}

function expandNodeWithUri(uri) {
	var index = uri.indexOf("~~");
	var prefix = 'do/' + uri.substring(0, index + 2);
	var uriNodeData = uri.substring(index + 2).split("..");
	var currentNode = store.tree.root;
	for (var i = 0; i < uriNodeData.length; i++) {
		currentNode = expandChildWithUri(currentNode, prefix + uriNodeData[i]);
		prefix = prefix + uriNodeData[i] + "..";
	}
}

window.onhashchange = function() {
	expandNodeWithUri(location.hash.substring(1));
}

function populateRoot() {
	var springPrefix = "do/spring/context";
	var beanDefs = getData(hostPrefix + springPrefix
			+ "..getBeanDefinitionNames");
	var beanElements = beanDefs.split('\n');
	if (beanElements.length > 0) {
		document.title = 'JIN - ' + getData(hostPrefix + 'do/spring/title')
				+ ' - ' + host;
	}
	for (var i = 0; i < beanElements.length; i++) {
		var beanElement = beanElements[i];
		if (dotted || beanElement.indexOf(".") == -1) {
			if (beanElement != '' && beanElement != 'invokerSpringBean'
					&& beanElement != 'invokerController'
					&& beanElement != 'invokerControllerPlus') {
				getDataAsync(hostPrefix + springPrefix + "..getBean~~"
						+ beanElement + "..getClass..getName", {
					springPrefix : springPrefix,
					beanElement : beanElement
				}, function(resp, context) {
					var type = resp.responseText;
					var isLeaf = Ext.Array.contains(leafTypes, type);
					store.getRootNode().appendChild(
							{
								text : context.beanElement
										+ " : "
										+ type.indexOf('{"error":') == 0 ? '!Error' : type
												.substring(type
														.lastIndexOf(".") + 1),
								type : type.indexOf('{"error":') == 0 ? '!Error' : type,
								leaf : isLeaf,
								uri : context.springPrefix + "..getBean~~"
										+ context.beanElement,
								qtip : "getBean~~" + context.beanElement
							});
					window.onhashchange();
				});
			}
		}
	}
	// for parent
	beanDefs = getData(hostPrefix + springPrefix
			+ "..getParent..getBeanDefinitionNames");
	beanElements = beanDefs.split('\n');
	for (var i = 0; i < beanElements.length; i++) {
		var beanElement = beanElements[i];
		if (dotted || beanElement.indexOf(".") == -1) {
			if (beanElement != '' && beanElement != 'invokerSpringBean'
					&& beanElement != 'invokerController'
					&& beanElement != 'invokerControllerPlus') {
				getDataAsync(hostPrefix + springPrefix
						+ "..getParent..getBean~~" + beanElement
						+ "..getClass..getName", {
					springPrefix : springPrefix,
					beanElement : beanElement
				}, function(resp, context) {
					var type = resp.responseText;
					var isLeaf = Ext.Array.contains(leafTypes, type);
					store.getRootNode().appendChild(
							{
								text : context.beanElement
										+ " : "
										+ type.indexOf('{"error":') == 0 ? '!Error' : type
												.substring(type
														.lastIndexOf(".") + 1),
								type : type.indexOf('{"error":') == 0 ? '!Error' : type,
								leaf : isLeaf,
								uri : context.springPrefix
										+ "..getParent..getBean~~"
										+ context.beanElement,
								qtip : "getParent..getBean~~"
										+ context.beanElement
							});
					window.onhashchange();
				});
			}
		}
	}
	var targetPrefix = "do/service/invoker..targetMap";
	var targetKeys = getData(hostPrefix + targetPrefix + "..keySet");
	var targetElements = targetKeys.split('\n');
	for (var i = 0; i < targetElements.length; i++) {
		var targetElement = targetElements[i];
		if (targetElement != '' && targetElement != 'system'
				&& targetElement != 'service' && targetElement != 'spring') {
			getDataAsync(hostPrefix + targetPrefix + ".." + targetElement
					+ "..getClass..getName", {
				targetElement : targetElement,
				targetPrefix : targetPrefix
			}, function(resp, context) {
				var type = resp.responseText;
				var isLeaf = Ext.Array.contains(leafTypes, type);
				store.getRootNode()
						.appendChild(
								{
									text : context.targetElement
											+ " : "
											+ type.indexOf('{"error":') == 0 ? '!Error' : type.substring(type
													.lastIndexOf(".") + 1),
									type : type.indexOf('{"error":') == 0 ? '!Error' : type,
									leaf : false,
									uri : context.targetPrefix + "..get~~"
											+ context.targetElement,
									qtip : "targetMap..get~~"
											+ context.targetElement
								});
				window.onhashchange();
			});
		}
	}
}

function ticker() {
	for (var i = 0; i < objectPanel.items.items.length; i++) {
		var item = objectPanel.items.items[i];
		if (item.uri) {
			getDataAsync(hostPrefix + item.uri, {
				item : item
			}, function(resp, context) {
				var value = resp.responseText;
				context.item.setText(value);
				var color1 = false;
				var color2 = false;
				var minVal = Ext.getCmp("min" + context.item.id).getValue();
				if (minVal != "") {
					if (parseInt(value) < minVal) {
						color1 = true;
					} else {
						color1 = false;
					}
				}

				var maxVal = Ext.getCmp("max" + context.item.id).getValue();
				if (maxVal != "") {
					if (parseInt(value) > maxVal) {
						color2 = true;
					} else {
						color2 = false;
					}
				}

				if (color1 || color2) {
					context.item.getEl().setStyle("background-color",
							(color1 ? "yellow" : "red"));
				} else {
					context.item.getEl().setStyle("background-color", "white");
				}
			});
		}
	}
	setTimeout(ticker, 5000);
}

function assignSmoothie(canvasId, url) {
	var smoothie = new SmoothieChart();
	smoothie.streamTo(document.getElementById(canvasId), delay /* delay */);
	var line = new TimeSeries();
	setInterval(function() {
		line.append(new Date().getTime(), getData(url));
	}, delay);
	smoothie.addTimeSeries(line);
}

var smoothieCanvasValues = {};

function assignSmoothieDiff(canvasId, url) {
	var smoothie = new SmoothieChart();
	smoothie.streamTo(document.getElementById(canvasId), delay /* delay */);
	var line = new TimeSeries();
	setInterval(function() {
		if (smoothieCanvasValues[canvasId] != undefined) {
			value = parseInt(getData(url));
			line.append(new Date().getTime(), value
					- smoothieCanvasValues[canvasId]);
			smoothieCanvasValues[canvasId] = value;
		} else {
			smoothieCanvasValues[canvasId] = parseInt(getData(url));
		}
	}, delay);
	smoothie.addTimeSeries(line);
}

var smoothieChartIds = {};

function addSmoothieChart(chartId, chartTitle, url) {
	if (smoothieChartIds[chartId] == undefined) {
		smoothieChartIds[chartId] = chartId;
		graphPanel
				.add([ {
					title : chartTitle,
					html : '<div style="width:1200;" height="100"><canvas id="'
							+ chartId
							+ '" width="575" height="100" style="float:left;"></canvas><canvas id="'
							+ chartId
							+ '_diff" width="575" height="100" style="float:right;"></canvas></div>'
				} ]);
		assignSmoothie(chartId, url);
		assignSmoothieDiff(chartId + '_diff', url);
	}
}

Ext.onReady(function() {

	var panel = Ext.create('Ext.Viewport', {
		title : 'JIN',
		layout : 'border',
		border : false,
		defaults : {
			collapsible : true,
			split : true
		},
		items : [ {
			title : 'Objects',
			region : 'west',
			margins : '5',
			width : 500,
			collapsible : true,
			layout : 'fit',
			items : [ treePanel ]
		}, {
			title : 'Monitor',
			region : 'center',
			margins : '5,5,5,5',
			flex : 1,
			layout : 'fit',
			items : [ objectPanel ]
		}, {
			title : 'Charts',
			region : 'south',
			margins : '5,5,5,5',
			items : [ graphPanel ]
		} ],
		renderTo : Ext.getBody()
	});

	populateRoot();
	// define cluster
	if (cluster) {
		Ext.MessageBox.prompt('Define Cluster', 'Comma sep. list:', function(
				btn, text) {
			if (btn == 'ok') {
				clusterList = text.split(",");
			}
		}, window, false, clusterList[0]);
	}
	ticker();

	objectPanel.add([ {
		xtype : 'label',
		text : ' ',
		width : 50,
		margin : 5
	}, {
		xtype : 'label',
		text : ' ',
		width : 50,
		margin : 5
	}, {
		xtype : 'label',
		text : ' Available JINs : ',
		style : 'width:150px; font: normal 20px arial;',
		margin : 5
	}, jinCombo, {
		xtype : 'label',
		text : ' ',
		width : 50,
		margin : 5
	} ]);

	objectPanel.add([ {
		xtype : 'label',
		text : 'Name : ',
		width : 50,
		margin : 5
	}, {
		xtype : 'label',
		text : 'URI : ',
		width : 50,
		margin : 5
	}, {
		xtype : 'textfield',
		id : 'name_',
		style : 'font: normal 22px arial',
		margin : 5
	}, {
		xtype : 'textfield',
		id : 'uri_',
		style : 'width:250px',
		margin : 5
	}, {
		xtype : 'button',
		text : 'Add',
		listeners : {
			click : function() {
				var fieldId = 'mfield' + idCounter++;
				var uri = Ext.getCmp("uri_").getValue();
				var name = Ext.getCmp("name_").getValue();
				var value = getData(hostPrefix + uri);
				addSmoothieChart(uri, name, hostPrefix + uri);
				objectPanel.add([ {
					xtype : 'textfield',
					text : 'min',
					id : 'min' + fieldId,
					width : 50,
					margin : 5
				}, {
					xtype : 'textfield',
					id : 'max' + fieldId,
					width : 50,
					margin : 5
				}, {
					xtype : 'label',
					text : Ext.getCmp("name_").getValue(),
					style : 'font: normal 22px arial',
					margin : 5
				}, {
					xtype : 'label',
					text : value,
					uri : Ext.getCmp("uri_").getValue(),
					id : fieldId,
					style : 'font: normal 30px arial;width:250px',
					padding : 10

				}, {
					xtype : 'button',
					iconCls : 'alert-critical',
					listeners : {}
				} ]);
			}
		}
	} ]);

});
