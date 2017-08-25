var Constants = Constants || {};


//Constants.SDP_BASE_RESOURCES_URL = '//localhost:8001';
//Constants.SDP_BASE_RESOURCES_URL = '//int-';

Constants.API_METADATA_URL = "//api.smartdatanet.it/metadataapi/api/";
Constants.API_DATA_URL = "//api.smartdatanet.it/api/";

//Constants.API_METADATA_SERVICES_URL = Constants.SDP_BASE_URL + "api/proxy/services/";
//Constants.API_METADATA_STREAM_URL = Constants.API_METADATA_SERVICES_URL + "streams/";
//Constants.API_ODATA_URL = Constants.SDP_BASE_URL + "api/proxy/odata/";
//Constants.API_DISCOVERY_URL = Constants.SDP_BASE_URL +"api/proxy/discovery/";


//Constants.SDP_IMAGES_BASE_URL = Constants.SDP_BASE_URL + 'img/' ;

//Constants.SDP_ICONS_STREAM_URL = Constants.SDP_IMAGES_BASE_URL+"icons/stream_icon_white.png";
//Constants.SDP_ICONS_DOMAIN_BASE_URL = Constants.SDP_IMAGES_BASE_URL+"domain/";
//Constants.SDP_STREAM_LOGO_BASE_URL = Constants.SDP_BASE_URL+ "api/proxy/resources/stream/icon/";

Constants.SDP_WEB_SOCKET_BASE_URL = 'wss://stream.smartdatanet.it/wss/';
Constants.WEB_SOCKET_USER = 'guest';
Constants.WEB_SOCKET_SECRET = 'Aekieh6F';
Constants.SDP_WEBSOCKET_CONNECTING = 'Connecting';
Constants.SDP_WEBSOCKET_CONNECTED = 'Connected';
Constants.SDP_WEBSOCKET_NOT_CONNECTED = 'Not Connected';

Constants.LINE_CHART_COLORS = ["#004586","#0084d1", "#d01e2a", "#f37a1f", "#f3c414", "#3d9e00", "#a6d615","#8f69c2","#e4477e"];

Constants.Time = {};
Constants.Time.ONE_MINUTE = 60000;
Constants.Time.ONE_HOUR = 3600000;
Constants.Time.ONE_DAY = 86400000;
Constants.Time.ONE_MONTH = 2678400000;
Constants.Time.ONE_YEAR = 31536000000;

Constants.MAP_TILES_CARTO_DB_POSITRON_URL = "http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";




angular.module('yucca.plugin', [
 // 'sdp.stream',
  'yucca.widgets',
  'yucca.utils',
  'yucca.filters'
]);

var yuccaWidgetsTemplatesModule = angular.module('yucca.widgets.templates', ['yucca.utils']);
var yuccaWidgetsModule = angular.module('yucca.widgets', ['yucca.widgets.templates', 'yucca.services', 'nvd3','leaflet-directive']);

var yuccaWidgetsFilter  = angular.module('yucca.filters', []);




yuccaWidgetsFilter.filter('safeNumber', function() {
	return function(input, decimal, euro) {
		var result = input;
		var suffix = "";
		if(!isNaN(input) ){
			if(isNaN(decimal))
				decimal=0;
			if(euro){
				result = input.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
				suffix = " \u20AC";
			}
			else
				result = input.toFixed(decimal);
		}
		return result +suffix;
	};
});

yuccaWidgetsFilter.filter('format_big_number', function() {
	return function(input) {
		console.log("input", input);
		var output = "";
		if (input) {
			input=Number.parseFloat(input);
			if(input<1000)
				output=input.toFixed(2);
			else if(input<1000000)
				output=(input/1000).toFixed(2)+" <span class='counter-group'>k</span>";
			else if(input<1000000000)
				output=(input/1000000).toFixed(2)+" <span class='counter-group'>M</span>";
			else if(input<1000000000000)
				output=(input/1000000000).toFixed(2)+" <span class='counter-group'>B</span>";
	    }
		return (""+output).replace(".", ","); 
	};
});

var yuccaServices = yuccaServices || angular.module('yucca.services', []);


yuccaServices.factory('metadataService',["$http","$q", function($http, $q) {


	var metadataService = {};
	
	var loadMetadata = function(metadataUrl, user_token){
		
		var httpBodyRequest = {
			method : 'GET',
			url : metadataUrl
		};
		if(user_token && user_token!=null && user_token!=''){
			httpBodyRequest.headers = {'Authorization': "Bearer " + user_token};
			httpBodyRequestwithCredentials = true;
		};

		return $http(httpBodyRequest);
		
	};
	
	metadataService.getStreamMetadata = function(tenant_code, stream_code, smartobject_code, user_token) {
		var URLBaseQuery = Constants.API_METADATA_URL + "detail/"+tenant_code + "/" + smartobject_code + "/"  + stream_code+'?';
		console.debug(URLBaseQuery);
		return loadMetadata(URLBaseQuery, user_token);

	};

	metadataService.getDatasetMetadata = function(tenant_code, dataset_code, user_token) {
		var URLBaseQuery = Constants.API_METADATA_URL + "detail/"+tenant_code + "/" + dataset_code + '?';
		return loadMetadata(URLBaseQuery, user_token);
	};
	
	metadataService.findMetadata = function(tenant_code, domain, search_query, opendata, user_token){
		var URLBaseQuery = "http:" + Constants.API_METADATA_URL + "search/full?end=10";
		
		if(typeof tenant_code!= 'undefined' && tenant_code!=null && tenant_code!='')
			URLBaseQuery += "&tenant=" + tenant_code;
		
		if(typeof domain!= 'undefined' && domain!=null && domain!='')
			URLBaseQuery += "&domain=" + domain;
		
		if(typeof search_query!= 'undefined' && search_query!=null && search_query!='')
			URLBaseQuery += "&q=" + search_query;
		
		if(typeof opendata != 'undefined' && opendata!=null){
			if(opendata)
				URLBaseQuery += "&opendata=true";
			else
				URLBaseQuery += "&opendata=false";
		}
		
		console.debug(URLBaseQuery);
		return loadMetadata(URLBaseQuery, user_token);

	};
	
	
	
	return metadataService;
}]);


yuccaServices.factory('dataService',["$http","$q", "$yuccaHelpers" , 
		function($http, $q,  $yuccaHelpers) {
	
	var dataService = {};

	dataService.getLastValue = function(tenant_code, stream_code, smartobject_code, user_token, dataCallback, dataCallbackIndex) {
		var self = this;
		var topic = $yuccaHelpers.stream.wsOutputUrl(tenant_code, stream_code, smartobject_code);
		var currentSettings = {};
		currentSettings.ws_url = Constants.SDP_WEB_SOCKET_BASE_URL;
		currentSettings.user_token = user_token;

		var clientSingleton = WebsocketStompSingleton.getInstance(currentSettings);
		console.debug("clientSingleton",clientSingleton);
		var client = clientSingleton.getWebClient();
		
		clientSingleton.addSubscription(topic, dataCallback,tenant_code, dataCallbackIndex);
		
		
		self.onDispose = function(){
			client.disconnect();
		};
	};
	
	var loadSingleData = function(collection, dataset_code,user_token, internalId){
		
		var dataUrl = "https:" + Constants.API_DATA_URL+dataset_code+"/"+collection+"('"+internalId+"')?$format=json";

		dataUrl += '&callback=JSON_CALLBACK';
		var httpBodyRequest = {
			method : 'GET',
			url : dataUrl
		};

		if(user_token && user_token!=null && user_token!=''){
			httpBodyRequest.headers = {'Authorization': "Bearer " + user_token};
			httpBodyRequestwithCredentials = true;
		};

		console.debug('dataUrl', dataUrl);
		return $http(httpBodyRequest);
	};
	
	var loadData = function(collection, dataset_code,user_token, filter,  skip, top, orderby) {
		
		var dataUrl = "https:" + Constants.API_DATA_URL+dataset_code+"/"+collection+"?$format=json";
		console.debug("filter", filter);
		if(filter && filter!=null)
			dataUrl += '&$filter='+filter;
		if(skip && skip!=null)
			dataUrl += '&$skip='+skip;
		if(top && top!=null)
			dataUrl += '&$top='+top;
		else
			dataUrl += '&$top=30';
		if(orderby && orderby!=null)
			dataUrl += '&$orderby='+orderby;
		
		dataUrl += '&callback=JSON_CALLBACK';
		var httpBodyRequest = {
			method : 'GET',
			url : dataUrl
		};


		
		if(user_token && user_token!=null && user_token!=''){
			httpBodyRequest.headers = {'Authorization': "Bearer " + user_token};
			httpBodyRequestwithCredentials = true;
		};

		console.debug('dataUrl', dataUrl);
		return $http(httpBodyRequest);
	};
	
	var loadDataStats = function(collection, dataset_code, user_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby){
		
		console.debug("loadDataStats", collection, dataset_code, user_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby );
		var dataUrl = "https:" + Constants.API_DATA_URL+dataset_code+"/"+collection+"?$format=json";

		if(time_group_by && time_group_by!=null)
			dataUrl += '&timeGroupBy='+time_group_by;
		if(time_group_operators && time_group_operators!=null)
			dataUrl += '&timeGroupOperators='+time_group_operators;
		if(time_group_filter && time_group_filter!=null)
			dataUrl += '&timeGroupFilter='+time_group_filter;
		if(skip && skip!=null)
			dataUrl += '&$skip='+skip;
		if(top && top!=null)
			dataUrl += '&$top='+top;
		else
			dataUrl += '&$top=1000';
		if(orderby && orderby!=null)
			dataUrl += '&$orderby='+orderby;
		
		dataUrl += '&callback=JSON_CALLBACK';
		var httpBodyRequest = {
			method : 'GET',
			url : dataUrl
		};


		
		if(user_token && user_token!=null && user_token!=''){
			httpBodyRequest.headers = {'Authorization': "Bearer " + user_token};
			httpBodyRequestwithCredentials = true;
		};

		console.debug('dataUrl', dataUrl);
		return $http(httpBodyRequest);
		
	};
	
	dataService.getMeasuresStats = function(dataset_code, request_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby) {
		return loadDataStats('MeasuresStats', dataset_code, request_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby);
	};
	
	dataService.getSocialFeeds = function(dataset_code,user_token,filter,  skip, top, orderby) {
		return loadData('SocialFeeds', dataset_code,user_token, filter,  skip, top, orderby);
	};
	
	dataService.getMeasures = function(dataset_code,user_token,filter,  skip, top, orderby) {
		return loadData('Measures', dataset_code,user_token,filter,  skip, top, orderby);
	};
	
	dataService.getDataEntities = function(dataset_code,user_token,filter,  skip, top, orderby) {
		return loadData('DataEntities', dataset_code,user_token,filter,  skip, top, orderby);
	};
	
	dataService.getSocialFeedsStats = function(dataset_code, user_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby) {
		return loadDataStats('SocialFeedsStats', dataset_code, user_token, time_group_by,time_group_operators,time_group_filter,  skip, top, orderby);
	};

	
	
	dataService.getBinariesData = function(url) {
		return $http.get(url+"?$format=json");
	};
	
	dataService.getMultipleDataEnties = function(dataset_code,user_token,filter, orderby, maxData) {
		if(maxData>10000) 
			maxData = 10000;
		var numOfLoop = parseInt(maxData/1000)+1;
		console.debug("numOfLoop", numOfLoop);
		
		var httpCalls = [];
		var top  = 1000;
		for (var i = 0; i< numOfLoop; i++) {
			httpCalls.push(dataService.getDataEntities(dataset_code,user_token,filter,  i*top, top, orderby));
			
		}
		return $q.all(httpCalls);
	};
	
	dataService.getSingleSocialFeeds = function(dataset_code,user_token,internalId) {
		return loadSingleData('SocialFeeds', dataset_code,user_token,internalId);
	};
	
	dataService.getSingleMeasures = function(dataset_code,user_token,internalId) {
		return loadSingleData('Measures', dataset_code,user_token,internalId);
	};
	
	dataService.getSingleDataEntities = function(dataset_code,user_token, internalId) {
		return loadSingleData('DataEntities', dataset_code,user_token,internalId);
	};
	
	
	

/*
	dataService.getStatisticData = function(code,user_token, time_group_by, time_group_operators,
		time_group_filter,  skip, top, orderby) {
		
		var statisticDataUrl = "https:" + Constants.API_ODATA_URL+code+"/MeasuresStats?$format=json";
		if(time_group_by && time_group_by!=null)
			statisticDataUrl += '&time_group_by='+time_group_by;
		if(time_group_operators && time_group_operators!=null)
			statisticDataUrl += '&time_group_operators='+time_group_operators;


		if(time_group_filter && time_group_filter!=null)
			statisticDataUrl += '&time_group_filter='+time_group_filter;
		if(skip && skip!=null)
			statisticDataUrl += '&$skip='+skip;
		if(top && top!=null)
			statisticDataUrl += '&$top='+top;
		else
			statisticDataUrl += '&$top=150';
		if(orderby && orderby!=null)
			statisticDataUrl += '&$orderby='+orderby;
		
		statisticDataUrl += '&callback=JSON_CALLBACK';
		var httpBodyRequest = {
			method : 'JSONP',
			url : statisticDataUrl
		};


		
		if(user_token && user_token!=null && user_token!=''){
			httpBodyRequest.headers = {'Authorization': "Bearer " + user_token};
			httpBodyRequestwithCredentials = true;
		};

		console.log('statisticDataUrl in getStreamDataMultiToken', statisticDataUrl);
		return $http(httpBodyRequest);
	}; */

	return dataService;
}]);


var yuccaUtilsModule = angular.module('yucca.utils', []);

yuccaUtilsModule.factory('$yuccaHelpers', [function () {
	return{
		"stream":{
			wsOutputUrl : function(tenant_code, stream_code, smartobject_code) {
				var smartobject_stream = "";

				if (stream_code && stream_code!=null && smartobject_code && smartobject_code!=null)
					smartobject_stream = smartobject_code + "_" + stream_code;
				else if (smartobject_code && smartobject_code!=null)
					smartobject_stream = smartobject_code;
				else 
					smartobject_stream += stream.stream_code;

				var result = "/topic/output." + tenant_code + "." + smartobject_stream;
				return result;
			},
		},
		"attrs":{
			num : function(value, min, max, defaultValue){
				var result = value;
				if(isNaN(value) || value == null || value == "" ||
						(typeof min != 'undefined' && min !=null && value<min) || 
						(typeof max != 'undefined' && max !=null && value>max))
						result = defaultValue;
				return result;
			},
			safe: function(value, defaultValue){
				var result = value;
				if(typeof value == 'undefined' || value == null || value == '')
					result = defaultValue;
				return result;
			}
		},
		"utils":{
			mongoDate2millis : function(dateIn) {
				var time = null;
				if(dateIn){
					//var offset = new Date().getTimezoneOffset();
					var parts = /\/Date\((-?\d+)([+-]\d{4})?.*/.exec(dateIn);

					if (parts[2] == undefined)
					    parts[2] = 0;
		            var p  = parseInt(parts[2]);
					time = new Date(parts[1] - (p * 60000));
				}
				return time;
			},
			mongoDate2string : function(dateIn) {
				return this.formatDateFromMillis(this.mongoDate2millis(dateIn).getTime());
			},
			isEmpty: function(input){
				return (typeof input == 'undefined' || input==null );
			},
			hex2Rgb: function(hex){
				if(hex.charAt(0)=="#") 
					hex = hex.substring(1,7);
				var r = parseInt((hex).substring(0,2),16);
				var g = parseInt((hex).substring(2,4),16);
				var b = parseInt((hex).substring(4,6),16);
				return r+","+g +","+b;
			},
			formatDateFromMillis: function(millis){
				var formattedDate = "";
				if(millis){
					var date   = new Date(millis);
					var d = date.getDate();
				    var m = date.getMonth() + 1;
				    var y = date.getFullYear();
				    var hh = date.getHours();
				    var mm = date.getMinutes();
					formattedDate = '' + (d <= 9 ? '0' + d : d) + '/' + (m<=9 ? '0' + m : m) + '/' + y + ' ' + (hh <= 9 ? '0' +hh : hh) + ":" +  (mm <= 9 ? '0' + mm : mm);
				}
				return formattedDate;
			},
			lZero: function(value){
				var result = "00";
				if(!isNaN(value)){
					result= (value <= 9 ? '0' + value : value);
				}
				return result;
				
			},
		    formatData: function(millis){
				var formattedDate = "";
				if(millis){
					var date   = new Date(millis);
					var d = date.getDate();
				    var m = date.getMonth() + 1;
				    var y = date.getFullYear();
				    var hh = date.getHours();
				    var mm = date.getMinutes();
				    var ss = date.getSeconds();
				    
					formattedDate = '' + y + '/' + (m<=9 ? '0' + m : m) + '/' + (d <= 9 ? '0' + d : d) + ' ' + (hh <= 9 ? '0' +hh : hh) + ":" +  (mm <= 9 ? '0' + mm : mm) + ":" + (ss <= 9 ? '0' + ss : ss);
				}

				return formattedDate;		    			
			},

		},
		"odata": {
			decodeDateFilter: function(attr){
				console.log("attr", attr);
				var minDateFormatted = null;
				var maxDateFormatted = null;
				var minDateMillis = null;
				var maxDateMillis = null;
				if(attr.timeRange!=null && attr.timeRange!=''){
					var minDate =  new Date();
					var maxDate =  new Date();
					
					switch (attr.timeRange) {
						case "today":
							minDate.setHours(0,0,0,0);
							maxDate.setHours(23,59,59,999);						
							break;
						case "yesterday":
							minDate.setDate(minDate.getDate()-1);
							minDate.setHours(0,0,0,0);
							maxDate.setDate(maxDate.getDate()-1);
							maxDate.setHours(23,59,59,999);						
							break;
						case "this_month":
							minDate =  new Date(minDate.getFullYear(), minDate.getMonth(), 1);
							maxDate =  new Date(minDate.getFullYear(), minDate.getMonth()+1, 0);
							maxDate.setHours(23,59,59,999);						
							break;
						case "last_month":
							minDate =  new Date(minDate.getFullYear(), minDate.getMonth()-1, 1);
							maxDate =  new Date(minDate.getFullYear(), maxDate.getMonth(), 0);
							maxDate.setHours(23,59,59,999);						
							break;
						case "this_year":
							minDate =  new Date(minDate.getFullYear(), 0, 1);
							maxDate =  new Date(minDate.getFullYear()+1, 0, 0);
							maxDate.setHours(23,59,59,999);						
							break;
						case "last_year":
							minDate =  new Date(minDate.getFullYear()-1, 0, 1);
							maxDate =  new Date(maxDate.getFullYear(), 0, 0);
							maxDate.setHours(23,59,59,999);						
							break;
						default: // today
							minDate.setHours(0,0,0,0);
							maxDate.setHours(23,59,59,999);						
						break;
					}
					minDateFormatted = this.formatData(minDate.getTime() - (minDate.getTimezoneOffset() * 60000));
					maxDateFormatted = this.formatData(maxDate.getTime() - (maxDate.getTimezoneOffset() * 60000));
					minDateMillis = minDate.getTime() - (minDate.getTimezoneOffset() * 60000);
					maxDateMillis = maxDate.getTime() - (maxDate.getTimezoneOffset() * 60000);
					
				}
				else if(attr.timeMaxDate!=null && attr.timeMaxDate!='' && attr.timeMinDate!=null && attr.timeMinDate!=''){
					minDateMillis = new Date(attr.timeMinDate).getTime();
					maxDateMillis = new Date(attr.timeMaxDate).getTime();
					minDateFormatted = this.formatData(minDateMillis - (new Date().getTimezoneOffset() * 60000));
					maxDateFormatted = this.formatData(maxDateMillis - (new Date().getTimezoneOffset() * 60000));
				}
				else{
					var minDate =  new Date();
					var maxDate =  new Date();
					minDate.setHours(0,0,0,0);
					maxDate.setHours(23,59,59,999);		
					minDateFormatted = this.formatData(minDate.getTime() - (minDate.getTimezoneOffset() * 60000));
					maxDateFormatted = this.formatData(maxDate.getTime() - (maxDate.getTimezoneOffset() * 60000));
					minDateMillis = minDate.getTime() - (minDate.getTimezoneOffset() * 60000);
					maxDateMillis = maxDate.getTime() - (maxDate.getTimezoneOffset() * 60000);
				}

				return {
						"timeFilter": 'time%20ge%20datetimeoffset%27'+minDateFormatted+'%27%20and%20time%20lt%20datetimeoffset%27'+maxDateFormatted+'%27',
						"minDateMillis": minDateMillis,
						"maxDateMillis": maxDateMillis
					};
			},
		    formatData: function(millis){
				var formattedDate = "";
				if(millis){
					var date   = new Date(millis);
					var d = date.getDate();
				    var m = date.getMonth() + 1;
				    var y = date.getFullYear();
				    var hh = date.getHours();
				    var mm = date.getMinutes();
				    var ss = date.getSeconds();
				    
				    var timezone = "02:00";
					formattedDate = '' + y + '-' + (m<=9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d) + 'T' + (hh <= 9 ? '0' +hh : hh) + ":" +  (mm <= 9 ? '0' + mm : mm) + ":" + (ss <= 9 ? '0' + ss : ss);
					formattedDate += '+' + timezone;
				}

				return formattedDate;		    			
			},
			extractTimeGroupFilter : function(minDateMillis, maxDateMillis){
				var timeGroupFilter = 'year';
				if(minDateMillis>0 && maxDateMillis> minDateMillis){
					var delta = maxDateMillis-minDateMillis;
					if(delta < Constants.Time.ONE_DAY)
						timeGroupFilter = 'hour_dayofmonth_month_year';
					else if(delta < Constants.Time.ONE_MONTH)
						timeGroupFilter = 'dayofmonth_month_year';
					else if(delta < Constants.Time.ONE_YEAR)
						timeGroupFilter = 'month_year';
				}
				return timeGroupFilter;
			},
			timeGroup2resultKey: function(timeGroupBy){
				var result  =  'year';
				if(timeGroupBy == 'hour_dayofmonth_month_year')
					result = 'hour';
				else if(timeGroupBy == 'dayofmonth_month_year')
					result = 'dayofmonth';
				else if(timeGroupBy == 'month_year')
					result = 'month';
				return result;
			},
			timeGroupLabel: function(timeGroupBy){
				var result  =  'Year';
				if(timeGroupBy == 'hour_dayofmonth_month_year')
					result = 'Hour of the day';
				else if(timeGroupBy == 'dayofmonth_month_year')
					result = 'Day of the month';
				else if(timeGroupBy == 'month_year')
					result = 'Month of the year';
				return result;
			}
			
		}, 
		"statistic": {
			timeAggregation : function(data){
				result = [];
				var labelFormat = "%H:%M";
				var dataValues = [];
				
				if(data!=null && data.length>1){
					var maxTime = data[0][0].getTime();
					var minTime = data[data.length-1][0].getTime();
					var elapsed = maxTime-minTime;
					var segment  = Constants.Time.ONE_YEAR;
					if(elapsed<Constants.Time.ONE_MINUTE){
						segment = Constants.Time.ONE_MINUTE/6;
						labelFormat = "%s s";
					}
					else if(elapsed<Constants.Time.ONE_HOUR){
						segment = Constants.Time.ONE_HOUR/6;
						labelFormat = "%m min";
					}
					else if(elapsed<Constants.Time.ONE_DAY){
						segment = Constants.Time.ONE_HOUR/12;
						labelFormat = "%H:%M";
					}
					else if(elapsed<Constants.Time.ONE_MONTH){
						segment = Constants.Time.ONE_MONTH/15;
						labelFormat = "%d/%M";
					}
					else if(elapsed<Constants.Time.ONE_YEAR){
						segment = Constants.Time.ONE_YEAR/12;
						labelFormat = "%b/%y";
					}
					segment = elapsed/10;
					var time = minTime;
					var dataCounter = 0;
				
					var dataList = [];
					for(var i=data.length-1;i>=0; i--){
						
						if(data[i][0].getTime()<time+segment){
							dataList.push(data[i][1]);
							dataCounter++;
						}
						else{
							result.push({"label":time,"value":dataCounter});
							time += segment;//data[i][0].getTime();
							 dataValues.push(dataList);
							dataCounter = 0;
							dataList = [];
						}
					}

				}
				
				console.debug("in", data);
				console.debug("out", result);
				console.debug("dataValues", dataValues);
				return {"data":result, "labelFormat": labelFormat, "dataValues": dataValues};
			}
		},
		"render": {
			safeNumber : function(input, decimal, isEuro) {
				var result = input;
				if(!isNaN(input) ){
					if(isEuro){
						result = this.formatEuro(input, decimal);
					}
					else{
						if(isNaN(decimal)){
							if(Math.abs(input)>100)
								decimal=0;
							else if(Math.abs(input)<1){
								decimal= -1*Math.log10(input) +1;
								if(decimal < 0)
									decimal = 0;
								else if(decimal>20)
									decimal =20;
							}
							else
								decimal = 2;
						}
						result = parseFloat(input).toFixed(decimal);
					}
				}
				return result;
			},
			completeTweet : function(originalTweet, createdAtFormatted){
				var completeTweet = originalTweet;
				completeTweet.getTextPretty = this.prettifyTwitterMessage(originalTweet.getText);
				completeTweet.createdAtFormatted =  createdAtFormatted;
				completeTweet.twitterLink = 'https://twitter.com/' + originalTweet.userScreenName + '/status/' + originalTweet.tweetid;
				completeTweet.twitterUserLink = 'https://twitter.com/' + originalTweet.userScreenName;
				return completeTweet;
			},
			safeTags : function (stringIn) {
				var outString = "";
				if((typeof stringIn != "undefined") && stringIn!=null){
					var typeStringIN = typeof stringIn;
					if (typeStringIN == "string")
						outString = stringIn.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
					else 
						outString = stringIn;
				}
			    return outString;   

			},
				
			prettifyTwitterUser : function(stringIn){
				var outString = "";
				if((typeof stringIn != "undefined") && stringIn!=null){
					var typeStringIN = typeof stringIn;
					if (typeStringIN == "string")
						outString = stringIn.replace(/(^|\W)(@[a-z\d][\w-]*)/ig, '$1<span class="tweet-user">$2</span>');
					else 
						outString = stringIn;
				}
				return outString;
			},
			prettifyTwitterHashtag : function(stringIn){
				var outString = "";
				if((typeof stringIn != "undefined") && stringIn!=null){
					var typeStringIN = typeof stringIn;
					if (typeStringIN == "string")
						outString = stringIn.replace(/(^|\W)(#[a-z\d][\w-]*)/ig, '$1<span class="tweet-hashtag">$2</span>');
					else 
						outString = stringIn;
				}
				return outString;
			},
			linkify: function(stringIn) {
				var outString = "";
				if((typeof stringIn != "undefined") && stringIn!=null){
					var typeStringIN = typeof stringIn;
					if (typeStringIN == "string"){
					    var  replacePattern1, replacePattern2, replacePattern3;
				
					    //URLs starting with http://, https://, or ftp://
					    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
					    outString = stringIn.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');
				
					    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
					    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
					    outString = outString.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');
				
					    //Change email addresses to mailto:: links.
					    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
					    outString = outString.replace(replacePattern3, '<a href="mailto:$1">$1</a>');
					} else 
						outString = stringIn;
				}

				return outString;
			},
			prettifyTwitterMessage: function(stringIn){
				var pretty  = this.safeTags(stringIn);
				pretty = this.linkify(pretty);
				pretty = this.prettifyTwitterHashtag(pretty);
				pretty = this.prettifyTwitterUser(pretty);
				return pretty;
			},
			
			colorLuminance: function(hex, lum) {
				// validate hex string
				hex = String(hex).replace(/[^0-9a-f]/gi, '');
				if (hex.length < 6) {
					hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
				}
				lum = lum || 0;

				// convert to decimal and change luminosity
				var rgb = "#", c, i;
				for (i = 0; i < 3; i++) {
					c = parseInt(hex.substr(i*2,2), 16);
					c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
					rgb += ("00"+c).substr(c.length);
				}

				return rgb;
			}, 
			formatEuro : function(input, decimal) {
				var result = input;
				if(typeof decimal == 'undefined' || isNaN(decimal))
					decimal = 2;
				var suffix = " \u20AC";
				if(!isNaN(input) ){
					//result = parseFloat(input).toFixed(decimal).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
					result = parseFloat(input).toFixed(decimal).toString().replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
				}
				return result +suffix;
			}
		}		
	};

}]);


var WebsocketStompSingleton= (function() {    
	var clientInstance = null; //private variable to hold the
	//only instance of client that will exits.


	var SubscriptionList = [];
	var SubscriptedElementsList = [];
	var connectedClient = false;


	var cancelAllSubscriptionsmetadata = function(){
		for(var i =0; i< SubscriptedElementsList.length ; i++){
			var widget = SubscriptedElementsList[i];
			if(debug)
				console.debug(':::: Unsubscribe for ::::', widget);
			widget.unsubscribe();      				  
		}
		SubscriptionList = [];
		SubscriptedElementsList = [];
	};

	var createClient = function(settings,count){ 
		console.debug("createClient");
		var intSettings = settings;	                    
		var client = Stomp.client(intSettings.ws_url);

		var user = Constants.WEB_SOCKET_USER;
		var password = Constants.WEB_SOCKET_SECRET;
		console.debug("intSettings",intSettings);
		if(intSettings.user_token && intSettings.user_token!=null && intSettings.user_token!=''){
			user = "Bearer " + intSettings.user_token;
			password = "";
		}
		console.debug("user = ", user);
		
		client.connect(user, password, function(frame) { //success Callback
			console.debug("connet 2 - SubscriptionList", SubscriptionList);

			for(var i =0; i< SubscriptionList.length ; i++){
				var widget = SubscriptionList[i];
				console.debug(':::: subscribe for ::::', widget);
				SubscriptedElementsList.push(client.subscribe(widget.keyTopic,widget.keyCallback));
			}
			console.debug(':::: Finish with the subscribe:::::');
			connectedClient=true;
		},
		function(frame) //error Callback
		{
			console.info("frame", frame);
			if (count<5) {
				console.debug("createClient count ::::::::::::: ",count);    						       
				setTimeout(function(){createClient(intSettings,++count);},count*1000);
				console.debug("awake.. ");		         	       
			} else{
				console.error(':::: connection error::::');
			}	
		});


		return {
			getWebClient: function(){               		 
				return client;
			},
			addSubscription : function(topic, callback,tenant_code, dataCallbackIndex){
				if(connectedClient){
					console.debug(':::: addSubscription Client connected::::', topic, callback);
					SubscriptionList.push({
						keyTopic:topic,
						keyCallback:callback,
						keyTenantCode: tenant_code,
						keyDataCallbackIndex: dataCallbackIndex
					});
					client.subscribe(topic, callback);
				}else{
					
					console.debug(':::: addSubscription Client NOT connected Add to SubscriptionList::::');
					SubscriptionList.push({
						keyTopic:topic,
						keyCallback:callback,
						keyTenantCode: tenant_code,
						keyDataCallbackIndex: dataCallbackIndex
					});
				}
			},
			cancelAllSubscriptionsmetadata:cancelAllSubscriptionsmetadata
		};                         
	};

	return {
		getInstance: function(settings,updateStatus){
			console.debug("clientInstance",clientInstance);
			if(clientInstance && clientInstance != null) return clientInstance; 
			if(!settings)
				return null;  

			if(!clientInstance){
				console.debug("::::  New Stomp Client Created ::::");
				clientInstance = createClient(settings,1);              	  
			}
			return clientInstance;
		}
	};
})();


yuccaWidgetsModule.directive('bulletChart', function() {
	return {
		restrict : 'E',
		scope:{data :'='},
		template: '<div id="bulletPanel{{panelIndex}}"></div>',
		link : function(scope, elem, attr) {
			console.log("attr", attr);
			console.log("elem", elem);
			console.log("scope", scope);
			scope.panelIndex  = Math.floor((Math.random() * 10000) + 1); 
			var margin = {top: 8, right: 8, bottom: 8, left: 8};
		    var formatNumber = d3.format(",.0f");
		    var format = function(d) { return formatNumber(d); };
		    var color = d3.scale.category20();

		    var margin = {top: 5, right: 40, bottom: 20, left: 120},
		    width = 960 - margin.left - margin.right,
		    height = 50 - margin.top - margin.bottom;


			scope.$watch('data', function() {
				var chart = d3.bullet().width(width).height(height);
				console.log("attr.width in", attr.width);
				console.log("attr.width in", scope.data);
				var width = (typeof attr.width == 'undefined' || attr.width == null) ? 500: parseInt(attr.width);
				var height = (typeof attr.height == 'undefined' || attr.height == null) ? 500: parseInt(attr.height);
				height = height - margin.top - margin.bottom;

				d3.select("#bulletPanel"+scope.panelIndex+" svg").remove();
				console.log("remove");
				var svg = d3.select("#bulletPanel"+scope.panelIndex).selectAll("svg").data(scope.data)
					.enter().append("svg")
					.attr("class","bullet-chart")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")").call(chart);
				console.log("svg", svg);

				  var title = svg.append("g")
			      .style("text-anchor", "end")
			      .attr("transform", "translate(-6," + height / 2 + ")");

			  title.append("text")
			      .attr("class", "title")
			      .text(function(d) { return d.title; });

			  title.append("text")
			      .attr("class", "subtitle")
			      .attr("dy", "1em")
			      .text(function(d) { return d.subtitle; });

			  d3.selectAll("button").on("click", function() {
			    svg.datum(randomize).call(chart.duration(1000)); // TODO automatic transition
			  });
				
				
			
			});



		}
	};
});

d3.bullet = function() {
	  var orient = "left", // TODO top & bottom
	      reverse = false,
	      duration = 0,
	      ranges = bulletRanges,
	      markers = bulletMarkers,
	      measures = bulletMeasures,
	      width = 380,
	      height = 30,
	      tickFormat = null;

	  // For each small multiple…
	  function bullet(g) {
	    g.each(function(d, i) {
	    	console.log("d",d);
	      var rangez = ranges.call(this, d, i).slice().sort(d3.descending),
	          markerz = markers.call(this, d, i).slice().sort(d3.descending),
	          measurez = measures.call(this, d, i).slice().sort(d3.descending),
	          g = d3.select(this);

	      // Compute the new x-scale.
	      var x1 = d3.scale.linear()
	          .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])
	          .range(reverse ? [width, 0] : [0, width]);

	      // Retrieve the old x-scale, if this is an update.
	      var x0 = this.__chart__ || d3.scale.linear()
	          .domain([0, Infinity])
	          .range(x1.range());

	      // Stash the new scale.
	      this.__chart__ = x1;

	      // Derive width-scales from the x-scales.
	      var w0 = bulletWidth(x0),
	          w1 = bulletWidth(x1);

	      // Update the range rects.
	      var range = g.selectAll("rect.range")
	          .data(rangez);

	      range.enter().append("rect")
	          .attr("class", function(d, i) { return "range s" + i; })
	          .attr("width", w0)
	          .attr("height", height)
	          .attr("x", reverse ? x0 : 0)
	        .transition()
	          .duration(duration)
	          .attr("width", w1)
	          .attr("x", reverse ? x1 : 0);

	      range.transition()
	          .duration(duration)
	          .attr("x", reverse ? x1 : 0)
	          .attr("width", w1)
	          .attr("height", height);

	      // Update the measure rects.
	      var measure = g.selectAll("rect.measure")
	          .data(measurez);

	      measure.enter().append("rect")
	          .attr("class", function(d, i) { return "measure s" + i; })
	          .attr("width", w0)
	          .attr("height", height / 3)
	          .attr("x", reverse ? x0 : 0)
	          .attr("y", height / 3)
	        .transition()
	          .duration(duration)
	          .attr("width", w1)
	          .attr("x", reverse ? x1 : 0);

	      measure.transition()
	          .duration(duration)
	          .attr("width", w1)
	          .attr("height", height / 3)
	          .attr("x", reverse ? x1 : 0)
	          .attr("y", height / 3);

	      // Update the marker lines.
	      var marker = g.selectAll("line.marker")
	          .data(markerz);

	      marker.enter().append("line")
	          .attr("class", "marker")
	          .attr("x1", x0)
	          .attr("x2", x0)
	          .attr("y1", height / 6)
	          .attr("y2", height * 5 / 6)
	        .transition()
	          .duration(duration)
	          .attr("x1", x1)
	          .attr("x2", x1);

	      marker.transition()
	          .duration(duration)
	          .attr("x1", x1)
	          .attr("x2", x1)
	          .attr("y1", height / 6)
	          .attr("y2", height * 5 / 6);

	      // Compute the tick format.
	      var format = tickFormat || x1.tickFormat(8);

	      // Update the tick groups.
	      var tick = g.selectAll("g.tick")
	          .data(x1.ticks(8), function(d) {
	            return this.textContent || format(d);
	          });

	      // Initialize the ticks with the old scale, x0.
	      var tickEnter = tick.enter().append("g")
	          .attr("class", "tick")
	          .attr("transform", bulletTranslate(x0))
	          .style("opacity", 1e-6);

	      tickEnter.append("line")
	          .attr("y1", height)
	          .attr("y2", height * 7 / 6);

	      tickEnter.append("text")
	          .attr("text-anchor", "middle")
	          .attr("dy", "1em")
	          .attr("y", height * 7 / 6)
	          .text(format);

	      // Transition the entering ticks to the new scale, x1.
	      tickEnter.transition()
	          .duration(duration)
	          .attr("transform", bulletTranslate(x1))
	          .style("opacity", 1);

	      // Transition the updating ticks to the new scale, x1.
	      var tickUpdate = tick.transition()
	          .duration(duration)
	          .attr("transform", bulletTranslate(x1))
	          .style("opacity", 1);

	      tickUpdate.select("line")
	          .attr("y1", height)
	          .attr("y2", height * 7 / 6);

	      tickUpdate.select("text")
	          .attr("y", height * 7 / 6);

	      // Transition the exiting ticks to the new scale, x1.
	      tick.exit().transition()
	          .duration(duration)
	          .attr("transform", bulletTranslate(x1))
	          .style("opacity", 1e-6)
	          .remove();
	    });
	    d3.timer.flush();
	  }

	  // left, right, top, bottom
	  bullet.orient = function(x) {
	    if (!arguments.length) return orient;
	    orient = x;
	    reverse = orient == "right" || orient == "bottom";
	    return bullet;
	  };

	  // ranges (bad, satisfactory, good)
	  bullet.ranges = function(x) {
	    if (!arguments.length) return ranges;
	    ranges = x;
	    return bullet;
	  };

	  // markers (previous, goal)
	  bullet.markers = function(x) {
	    if (!arguments.length) return markers;
	    markers = x;
	    return bullet;
	  };

	  // measures (actual, forecast)
	  bullet.measures = function(x) {
	    if (!arguments.length) return measures;
	    measures = x;
	    return bullet;
	  };

	  bullet.width = function(x) {
	    if (!arguments.length) return width;
	    width = x;
	    return bullet;
	  };

	  bullet.height = function(x) {
	    if (!arguments.length) return height;
	    height = x;
	    return bullet;
	  };

	  bullet.tickFormat = function(x) {
	    if (!arguments.length) return tickFormat;
	    tickFormat = x;
	    return bullet;
	  };

	  bullet.duration = function(x) {
	    if (!arguments.length) return duration;
	    duration = x;
	    return bullet;
	  };

	  return bullet;
	};

	function bulletRanges(d) {
	  return d.ranges;
	}

	function bulletMarkers(d) {
	  return d.markers;
	}

	function bulletMeasures(d) {
	  return d.measures;
	}

	function bulletTranslate(x) {
	  return function(d) {
	    return "translate(" + x(d) + ",0)";
	  };
	}

	function bulletWidth(x) {
	  var x0 = x(0);
	  return function(d) {
	    return Math.abs(x(d) - x0);
	  };
	}


yuccaWidgetsModule.directive('forcedirectedChart', function() {
    return {
      restrict: 'E',
      scope: {
        links: '='
      },
      template: '<div class="forcedirected-chart"><div id="forcedirectedPanel{{panelIndex}}"></div>' +
        '<div class="forcedirected-legend">' +
        '<div class="forcedirected-legend-block" ng-repeat="block in legendBlocks"><div class="forcedirected-legend-block-title">{{block.label}}</div>' +
        '<span ng-repeat="n in block.items track by $index" class="forcedirected-legend-item legend_{{n.style}}"><span class="forcedirected-legend-bullet"></span><span>{{n.label}}</span>' +
        '</div>',
      link: function(scope, elem, attr) {
				console.log("forcedirected - link");
        scope.panelIndex = Math.floor((Math.random() * 10000) + 1);
        var margin = {
          top: 8,
          right: 8,
          bottom: 8,
          left: 8
        };

        function circlePath(cx, cy, r) {
          return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
        }

        function hexagonPath(cx, cy, a) {
          var h = a * Math.sin(Math.PI / 3);
          var points = [];
          points.push({
            x: cx - a,
            y: cy
          });
          points.push({
            x: cx - a / 2,
            y: cy + h
          });
          points.push({
            x: cx + a / 2,
            y: cy + h
          });
          points.push({
            x: parseInt(cx) + parseInt(a),
            y: cy
          });
          points.push({
            x: cx + a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a,
            y: cy
          }); /// ?????
          var path = "M 0 0";
          for (var i = 0; i < points.length; i++) {
            var p = points[i];
            path += "L" + p.x + " " + p.y + " ";
          }
          return path + " Z";
        }

        var nodePaths = function(type, r) {
          if (type == "hexagon")
            return hexagonPath(0, 0, r);
          else
            return circlePath(0, 0, r);

        };

        var nodeTypeIcon = scope.$eval(attr.nodeTypeIcon);
        if (typeof attr.linkLine == 'undefined' || attr.linkLine === null)
          attr.linkLine = "bezier";

        var linkLength = 120;
        if (typeof attr.linkLength != 'undefined' && attr.linkLength !== null && attr.linkLength !== "null" && attr.linkLength !== "") {
          linkLength = attr.linkLength;
        }

        var radiusMin = 10;
        var radius = Math.round(radiusMin + radiusMin / 2);

        if (typeof attr.nodeSize != 'undefined' && attr.nodeSize !== null && attr.nodeSize !== "null" && attr.nodeSize !== "") {
          radius = attr.nodeSize;
          radiusMin = Math.round(2 * radius / 3);
        }

        var computeStatistic = false;
        if (attr.computeStatistic == 'true')
          computeStatistic = true;

        scope.$watch('links', function() {
          var width = (typeof attr.width == 'undefined' || attr.width === null) ? 500 : parseInt(attr.width);
          var height = (typeof attr.height == 'undefined' || attr.height === null) ? 500 : parseInt(attr.height);

          height = height - margin.top - margin.bottom;
          var links = scope.links;
          var nodes = {};
          var linksTypes = {};
          scope.legendBlocks = {
            "Links": {
              items: [],
              name: "Links"
            }
          };

          // Compute the distinct nodes from the links.
          links.forEach(function(link) {
            var nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.sourceType];

            link.source = nodes[link.source + "_" + link.sourceType] || (nodes[link.source + "_" + link.sourceType] = {
              name: link.source,
              type: link.sourceType,
              label: link.sourceLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.source.name + "_" + link.sourceType].count += link.count;

            nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.targetType];

            link.target = nodes[link.target + "_" + link.targetType] || (nodes[link.target + "_" + link.targetType] = {
              name: link.target,
              type: link.targetType,
              label: link.targetLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.target.name + "_" + link.targetType].count += link.count;

            // prepare legend for links
            if (typeof linksTypes[link.type] == 'undefined') {
              linksTypes[link.type] = link.type;
              scope.legendBlocks.Links.items.push({
                "label": link.type,
                "style": "Links " + link.type
              });
            }
          });

          scope.legendNodes = [];

          for (var key in nodes) {
            if (nodes.hasOwnProperty(key)) {
              var nodeType = nodes[key].type;
              if (typeof scope.legendBlocks[nodeType] == 'undefined')
                scope.legendBlocks[nodeType] = {
                  "name": nodeType,
                  "label": nodes[key].label,
                  "items": []
                };
              scope.legendBlocks[nodeType].items.push({
                "label": nodes[key].name,
                "style": nodes[key].type + " " + clearString(nodes[key].name.split(' ').join('_'))
              });

            }
          }

          var force = d3.layout.force().nodes(d3.values(nodes)).links(links).size([width, height]).linkDistance(linkLength).charge(-800).on("tick", tick)
            .start();

          d3.select("#forcedirectedPanel" + scope.panelIndex + " svg").remove();
          var svg = d3.select("#forcedirectedPanel" + scope.panelIndex).append("svg").attr("class", "forcedirected-chart").attr("width",
            width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

          var path = svg.append("g").selectAll("path").data(force.links()).enter().append("path").attr("class", function(d) {
            return "link link_" + d.type + " " + "source_" + clearString(d.source.name.split(' ').join('_')) + " " + "target_" + clearString(d.target.name.split(' ').join('_')) +
              " link_" + d.sourceType + "_" + d.targetType;
          }).attr("marker-end", function(d) {
            return "url(#link_" + d.sourceType + "_" + d.targetType + ")";
          });

          var circle = svg.append("g").selectAll("circle").data(force.nodes()).enter().append("path")
            .attr("d", function(d) {
              return nodePaths(d.nodeIcon, d.radius);
            }).attr("class", function(d) {
              var clazz = "node " + d.type;
              if (typeof d.name != 'undefined')
                clazz += " " + clearString(d.name.split(' ').join('_'));
              return clazz;
            }).call(force.drag);

          var text = svg.append("g").selectAll("text").data(force.nodes()).enter().append("text").attr("x", 8).attr("y", ".31em").attr("class", function(d) {
            var clazz = "label " + d.type;
            if (typeof d.name != 'undefined')
              clazz += " " + clearString(d.name.split(' ').join('_'));
            return clazz;
          }).text(function(d) {
            return d.name;
          });

          function tick(d) {
            path.attr("d", linkLine);
            circle.attr("transform", transform);
            text.attr("transform", transform);
          }

        });

        function linkLine(d) {
          if (attr.linkLine == "bezier")
            return linkBezier(d);
          else if (attr.linkLine == "arc")
            return linkArc(d);
          else if (attr.linkLine == "straight")
            return linkStraight(d);
          else
            return linkBezier(d);
        }

        function linkArc(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        }

        function linkStraight(d) {
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        }

        function clearString(input) {
          return input.replace(/[^\w\s]/gi, '');
        }

        function linkBezier(d) {
          var curvature = 0.5;
          var xi = d3.interpolateNumber(d.source.x, d.target.x);
          var x2 = xi(curvature);
          var x3 = xi(1 - curvature);

          return "M" + d.source.x + "," + d.source.y +
            "C" + x2 + "," + d.source.y +
            " " + x3 + "," + d.target.y +
            " " + d.target.x + "," + d.target.y;
        }

        function transform(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }

      }
    };

  });
  
  /*
	yuccaWidgetsModule.directive('forcedirectedChart', function() {
	return {
		restrict : 'E',
		scope : {
			links : '='
		},
		template : '<div class="forcedirected-chart"><div id="forcedirectedPanel{{panelIndex}}"></div>'
				+ '<div class="forcedirected-legend">'
				+ '<div class="forcedirected-legend-block" ng-repeat="block in legendBlocks"><div class="forcedirected-legend-block-title">{{block.label}}</div>'
				+ '<span ng-repeat="n in block.items track by $index" class="forcedirected-legend-item legend_{{n.style}}"><span class="forcedirected-legend-bullet"></span><span>{{n.label}}</span>'
				+ '</div>',
		link : function(scope, elem, attr) {
			console.log("attr", attr);
			console.log("elem", elem);
			console.log("scope", scope);
			scope.panelIndex = Math.floor((Math.random() * 10000) + 1);
			var margin = {
				top : 8,
				right : 8,
				bottom : 8,
				left : 8
			};

			function circlePath(cx, cy, r){
			    return 'M '+cx+' '+cy+' m -'+r+', 0 a '+r+','+r+' 0 1,0 '+(r*2)+',0 a '+r+','+r+' 0 1,0 -'+(r*2)+',0';
			}

			function hexagonPath(cx, cy, a){
				var h = a*Math.sin(Math.PI/3);
				var points  = [];
				points.push({x: cx-a, y: cy});
				points.push({x: cx-a/2, y: cy+h});
				points.push({x: cx+a/2, y: cy+h});
				points.push({x: cx+a, y: cy});
				points.push({x: cx+a/2, y: cy-h});
				points.push({x: cx-a/2, y: cy-h});
				points.push({x: cx-a, y: cy});

				var path = "M 0 0";
				for (var i = 0; i < points.length; i++) {
					var p = points[i];
					path += "L"+p.x + " " + p.y + " ";
				}
			    return path +" Z";
			}


			var nodePaths = function(type, r) {
					console.log("nodePaths", type, r);
					if(type == "hexagon")
						return hexagonPath(0,0,8);
					else
						return circlePath(0,0,r);

			};

			if(typeof attr.nodeIcon =='undefined' || attr.nodeIcon == null)
				attr.nodeIcon = "circle";
			if(typeof attr.linkLine =='undefined' || attr.linkLine == null)
				attr.linkLine = "bezier";

			var linkLength = 120;
			if(typeof attr.linkLength !='undefined' && attr.linkLength != null&& attr.linkLength != "null" && attr.linkLength != ""){
				linkLength = attr.linkLength;
			}

			var radiusMin = 10;
			var radius = Math.round(radiusMin+radiusMin/2);

			if(typeof attr.nodeSize !='undefined' && attr.nodeSize != null && attr.nodeSize != "null" && attr.nodeSize != ""){
				radius = attr.nodeSize;
				radiusMin = Math.round(2*radius/3);
			}

			var computeStatistic = false;
			if(attr.computeStatistic =='true')
				computeStatistic = true;


			scope.$watch('links', function() {
				console.log("attr.width in", attr.width);
				var width = (typeof attr.width == 'undefined' || attr.width == null) ? 500 : parseInt(attr.width);
				var height = (typeof attr.height == 'undefined' || attr.height == null) ? 500 : parseInt(attr.height);

				height = height - margin.top - margin.bottom;

				var links = scope.links;
				var nodes = {};

				// Compute the distinct nodes from the links.
				links.forEach(function(link) {
					link.source = nodes[link.source] || (nodes[link.source] = {name : link.source, type: link.sourceColumn, label: link.sourceLabel, count:0, radius: radius});
					nodes[link.source.name].count += link.count;
					link.target = nodes[link.target] || (nodes[link.target] = {name : link.target, type: link.targetColumn, label: link.targetLabel, count:0, radius: radius});
					nodes[link.target.name].count += link.count;
				});

				if(computeStatistic){
					var statsMap = {};
					for( var key in nodes ) {
	            	    if (nodes.hasOwnProperty(key)){
	            	    	var nodeType = nodes[key].type;
	            	    	if(typeof statsMap[nodeType] == 'undefined')
	            	    		statsMap[nodeType]={"name":nodeType, "min": nodes[key].count,"max": nodes[key].count};
	            	    	statsMap[nodeType].min = (nodes[key].count<statsMap[nodeType].min?nodes[key].count:statsMap[nodeType].min) ;
	            	    	statsMap[nodeType].max = (nodes[key].count>statsMap[nodeType].max?nodes[key].count:statsMap[nodeType].max) ;

	            	    }
					}

					for( var key in nodes ) {
	            	    if (nodes.hasOwnProperty(key)){
	            	    	var nodeType = nodes[key].type;
	            	    	if(statsMap[nodeType].max==statsMap[nodeType].min)
	            	    		nodes[key].radius = radius;
	            	    	else
	            	    		nodes[key].radius =Math.round(radiusMin*(nodes[key].count-statsMap[nodeType].min)/(statsMap[nodeType].max-statsMap[nodeType].min) +radiusMin/2);
	            	    }
					}
				}



				console.log("links", links);
				console.log("nodes", nodes);
				scope.legendNodes = [];
				scope.legendBlocks ={};

				for( var key in nodes ) {
            	    if (nodes.hasOwnProperty(key)){
            	    	var nodeType = nodes[key].type;
            	    	if(typeof scope.legendBlocks[nodeType] == 'undefined')
            	    		scope.legendBlocks[nodeType]={"name":nodeType, "label": nodes[key].label,"items":[]};
            	    	scope.legendBlocks[nodeType].items.push({"label": nodes[key].name, "style": nodes[key].type + " " + clearString(nodes[key].name.split(' ').join('_'))});

            	    }
				}

				console.log("scope.legendNodes", scope.legendBlocks);

				var force = d3.layout.force().nodes(d3.values(nodes)).links(links).size([ width, height ]).linkDistance(linkLength).charge(-300).on("tick", tick)
						.start();

				d3.select("#forcedirectedPanel" + scope.panelIndex + " svg").remove();
				var svg = d3.select("#forcedirectedPanel" + scope.panelIndex).append("svg").attr("class", "forcedirected-chart").attr("width",
						width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);
				
//				svg.append("defs").selectAll("marker").data(force.links()).enter().append("marker").attr("id", function(d) {
//					return "link_"+d.sourceColumn+"_"+d.targetColumn;
//				}).attr("viewBox", "0 -5 10 10").attr("refX", radius*2).attr("refY", -1.5).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient","auto")
//						.append("path").attr("d", "M0,-5L10,0L0,5");
//

				
				var path = svg.append("g").selectAll("path").data(force.links()).enter().append("path").attr("class", function(d) {
					return "link link_" + d.type + " " + "source_"+clearString(d.source.name.split(' ').join('_'))+ " " + "target_"+clearString(d.target.name.split(' ').join('_')) +
					" link_"+d.sourceColumn+"_"+d.targetColumn;
				}).attr("marker-end", function(d) {
					return "url(#link_"+d.sourceColumn+"_"+d.targetColumn + ")";
				});



				//var circle1= svg.append("g").selectAll("circle").data(force.nodes()).enter().append("circle").attr("r", 6).attr("class", function(d) {return "node " + d.type;}).call(force.drag);
				console.log("[attr.nodeIcon",attr.nodeIcon);

				var circle= svg.append("g").selectAll("circle").data(force.nodes()).enter().append("path")
					.attr("d", function(d) {
						return nodePaths(attr.nodeIcon, d.radius);
					}).attr("class", function(d) {
						var clazz = "node " + d.type;
						if(typeof d.name!= ' undefined')
							clazz +=" "+clearString(d.name.split(' ').join('_'));
						return clazz;
					}).call(force.drag);

				var text = svg.append("g").selectAll("text").data(force.nodes()).enter().append("text").attr("x", 8).attr("y", ".31em").attr("class", function(d) {
					var clazz = "label " + d.type;
					if(typeof d.name!= ' undefined')
						clazz +=" "+clearString(d.name.split(' ').join('_'));
					return clazz;
				}).text(function(d) {
					return d.name;
				});


				function tick(d) {
					path.attr("d", linkLine);
					circle.attr("transform", transform);
					text.attr("transform", transform);
				}

			});


			function linkLine(d){
				if(attr.linkLine=="bezier")
					return linkBezier(d);
				else if(attr.linkLine=="arc")
					return linkArc(d);
				else if(attr.linkLine=="straight")
					return linkStraight(d);
				else
					return linkBezier(d);
			}

			// Use elliptical arc path segments to doubly-encode directionality.
			function linkArc(d) {
				var dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy);
				return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
			}

			function linkStraight(d) {
				return "M" + d.source.x + "," + d.source.y + "L" +  d.target.x + "," + d.target.y;
			}


			function clearString(input){
				return input.replace(/[^\w\s]/gi, '');
			}


			function linkBezier(d){
				var curvature = .5;
				var xi = d3.interpolateNumber(d.source.x,d.target.x);
				var x2 = xi(curvature);
		        var x3 = xi(1 - curvature);

		      return "M" + d.source.x + "," + d.source.y
		           + "C" + x2 + "," + d.source.y
		           + " " + x3 + "," + d.target.y
		           + " " + d.target.x + "," + d.target.y;
			}


			function transform(d) {
				return "translate(" + d.x + "," + d.y + ")";
			}

			function ColorLuminance(hex, lum) {
				// validate hex string
				hex = String(hex).replace(/[^0-9a-f]/gi, '');
				if (hex.length < 6) {
					hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
				}
				lum = lum || 0;

				// convert to decimal and change luminosity
				var rgb = "#", c, i;
				for (i = 0; i < 3; i++) {
					c = parseInt(hex.substr(i * 2, 2), 16);
					c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
					rgb += ("00" + c).substr(c.length);
				}

				return rgb;
			}

		}
	};


});
*/
yuccaWidgetsModule.directive('forcedirectedChart', function() {
    return {
      restrict: 'E',
      scope: {
        links: '='
      },
      template: '<div class="forcedirected-chart"><div id="forcedirectedPanel{{panelIndex}}" class="forcedirected-canvas"></div>' +
        '<div class="forcedirected-legend">' +
        '<div class="forcedirected-legend-block {{block.name}}" ng-repeat="block in legendBlocks"><div class="forcedirected-legend-block-title">{{block.label}}</div>' +
        '<span ng-repeat="n in block.items track by $index" class="forcedirected-legend-item legend_{{n.style}}"><span class="forcedirected-legend-bullet"></span><span>{{n.label}}</span>' +
        '</div>',
      link: function(scope, elem, attr) {
        scope.panelIndex = Math.floor((Math.random() * 10000) + 1);
        var margin = {
          top: 8,
          right: 8,
          bottom: 8,
          left: 8
        };

        function circlePath(cx, cy, r) {
          return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
        }

        function hexagonPath(cx, cy, a) {
          var h = a * Math.sin(Math.PI / 3);
          var points = new Array();
          points.push({
            x: cx - a,
            y: cy
          });
          points.push({
            x: cx - a / 2,
            y: cy + h
          });
          points.push({
            x: cx + a / 2,
            y: cy + h
          });
          points.push({
            x: parseInt(cx) + parseInt(a),
            y: cy
          });
          points.push({
            x: cx + a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a,
            y: cy
          }); /// ?????
          var path = "M 0 0";
          for (var i = 0; i < points.length; i++) {
            var p = points[i];
            path += "L" + p.x + " " + p.y + " ";
          }
          return path + " Z";
        }

        var nodePaths = function(type, r) {
          if (type == "hexagon")
            return hexagonPath(0, 0, r);
          else
            return circlePath(0, 0, r);

        };

        var nodeTypeIcon = scope.$eval(attr.nodeTypeIcon);
        console.log("nodeTypeIcon",nodeTypeIcon);
        if (typeof attr.linkLine == 'undefined' || attr.linkLine === null)
          attr.linkLine = "bezier";

        var linkLength = 120;
        if (typeof attr.linkLength != 'undefined' && attr.linkLength !== null && attr.linkLength !== "null" && attr.linkLength !== "") {
          linkLength = attr.linkLength;
        }

        var radiusMin = 10;
        var radius = Math.round(radiusMin + radiusMin / 2);

        if (typeof attr.nodeSize != 'undefined' && attr.nodeSize !== null && attr.nodeSize !== "null" && attr.nodeSize !== "") {
          radius = attr.nodeSize;
          radiusMin = Math.round(2 * radius / 3);
        }

  //      var computeStatistic = false;
  //      if (attr.computeStatistic == 'true')
  //        computeStatistic = true;

        scope.$watch('links', function() {
          var width = (typeof attr.width == 'undefined' || attr.width === null) ? 500 : parseInt(attr.width);
          var height = (typeof attr.height == 'undefined' || attr.height === null) ? 500 : parseInt(attr.height);

          height = height - margin.top - margin.bottom;
          var links = scope.links;
          var nodes = {};
          var linksTypes = {};
          scope.legendBlocks = {
            "Links": {
              items: [],
              name: "Links",
              label: ""
            }
          };

          // Compute the distinct nodes from the links.
          links.forEach(function(link) {
            var nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.sourceType];

            link.source = nodes[link.source + "_" + link.sourceType] || (nodes[link.source + "_" + link.sourceType] = {
              name: link.source,
              type: link.sourceType,
              label: link.sourceLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.source.name + "_" + link.sourceType].count += link.count;

            nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.targetType];

            link.target = nodes[link.target + "_" + link.targetType] || (nodes[link.target + "_" + link.targetType] = {
              name: link.target,
              type: link.targetType,
              label: link.targetLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.target.name + "_" + link.targetType].count += link.count;

            // prepare legend for links
            if (typeof linksTypes[link.type] == 'undefined') {
              linksTypes[link.type] = link.type;
              scope.legendBlocks.Links.items.push({
                "label": link.type,
                "style": "Links " + link.type
              });
            }
          });

          scope.legendNodes = [];

          for (var key in nodes) {
            if (nodes.hasOwnProperty(key)) {
              var nodeType = nodes[key].type;
              if (typeof scope.legendBlocks[nodeType] == 'undefined')
                scope.legendBlocks[nodeType] = {
                  "name": nodeType,
                  "label": nodes[key].label,
                  "items": []
                };
              scope.legendBlocks[nodeType].items.push({
                "label": nodes[key].name,
                "style": nodes[key].type + " " + clearString(nodes[key].name.split(' ').join('_'))
              });

            }
          }

          var force = d3.layout.force().nodes(d3.values(nodes)).links(links).size([width, height]).linkDistance(linkLength).charge(-800).on("tick", tick)
            .start();

          d3.select("#forcedirectedPanel" + scope.panelIndex + " svg").remove();
          var svg = d3.select("#forcedirectedPanel" + scope.panelIndex).append("svg").attr("class", "forcedirected-chart").attr("width",
            width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

          var path = svg.append("g").selectAll("path").data(force.links()).enter().append("path").attr("class", function(d) {
            return "link link_" + d.type + " " + "source_" + clearString(d.source.name.split(' ').join('_')) + " " + "target_" + clearString(d.target.name.split(' ').join('_')) +
              " link_" + d.sourceType + "_" + d.targetType;
          }).attr("marker-end", function(d) {
            return "url(#link_" + d.sourceType + "_" + d.targetType + ")";
          });

          var circle = svg.append("g").selectAll("circle").data(force.nodes()).enter().append("path")
            .attr("d", function(d) {
              return nodePaths(d.nodeIcon, d.radius);
            }).attr("class", function(d) {
              var clazz = "node " + d.type;
              if (typeof d.name != 'undefined')
                clazz += " " + clearString(d.name.split(' ').join('_'));
              return clazz;
            }).call(force.drag);

          var text = svg.append("g").selectAll("text").data(force.nodes()).enter().append("text").attr("x", 8).attr("y", ".31em").attr("class", function(d) {
            var clazz = "label " + d.type;
            if (typeof d.name != 'undefined')
              clazz += " " + clearString(d.name.split(' ').join('_'));
            return clazz;
          }).text(function(d) {
            return d.name;
          });

          function tick(d) {
            path.attr("d", linkLine);
            circle.attr("transform", transform);
            text.attr("transform", transform);
          }

        });

        function linkLine(d) {
          if (attr.linkLine == "bezier")
            return linkBezier(d);
          else if (attr.linkLine == "arc")
            return linkArc(d);
          else if (attr.linkLine == "straight")
            return linkStraight(d);
          else
            return linkBezier(d);
        }

        function linkArc(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        }

        function linkStraight(d) {
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        }

        function clearString(input) {
          return input.replace(/[^\w\s]/gi, '');
        }

        function linkBezier(d) {
          var curvature = 0.5;
          var xi = d3.interpolateNumber(d.source.x, d.target.x);
          var x2 = xi(curvature);
          var x3 = xi(1 - curvature);

          return "M" + d.source.x + "," + d.source.y +
            "C" + x2 + "," + d.source.y +
            " " + x3 + "," + d.target.y +
            " " + d.target.x + "," + d.target.y;
        }

        function transform(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }

      }
    };

  });
yuccaWidgetsModule.directive('sankeyChart', function() {
	return {
		restrict : 'E',
		scope:{data :'='},
		template: '<div id="sankeyPanel{{panelIndex}}"></div>'+
				'<div class="legend" ng-show="legendColors.length>0">'+
				'<span class="legend-label">0</span>' +
				'<span ng-repeat="c in legendColors track by $index" class="legend-bullet" style="background-color: {{c}}">{{cc}}</span>' +
				'<span class="legend-label">100</span>' +
				'</div>',
		link : function(scope, elem, attr) {
			console.log("attr", attr);
			console.log("elem", elem);
			console.log("scope", scope);
			scope.panelIndex  = Math.floor((Math.random() * 10000) + 1); 
			var margin = {top: 8, right: 8, bottom: 8, left: 8};
		    var formatNumber = d3.format(",.0f");
		    var format = function(d) { return formatNumber(d); };
		    var color = d3.scale.category20();


			scope.$watch('data', function() {
				console.log("attr.width in", attr.width);
				var width = (typeof attr.width == 'undefined' || attr.width == null) ? 500: parseInt(attr.width);
				var height = (typeof attr.height == 'undefined' || attr.height == null) ? 500: parseInt(attr.height);
				height = height - margin.top - margin.bottom;

				d3.select("#sankeyPanel"+scope.panelIndex+" svg").remove();
				var svg = d3.select("#sankeyPanel"+scope.panelIndex).append("svg").attr("class","sankey-chart").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				var sankey = d3.sankey().nodeWidth(15).nodePadding(10).size([width, height]);
				
				var path = sankey.link();

				sankey.nodes(scope.data.nodes).links(scope.data.links).layout(32);

			  var link = svg.append("g").selectAll(".link")
			      .data(scope.data.links)
			      .enter().append("path")
			      .attr("class", "link")
			      .attr("d", path)
			      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
			      .sort(function(a, b) { return b.dy - a.dy; });

			  link.append("title")
			      .text(function(d) { return d.source.name + " â†’ " + d.target.name + "\n" + format(d.value); });

			  var node = svg.append("g").selectAll(".node")
			      .data(scope.data.nodes)
			      .enter().append("g")
			      .attr("class", "node")
			      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
			      .call(d3.behavior.drag()
			      .origin(function(d) { return d; })
			      .on("dragstart", function() { this.parentNode.appendChild(this); })
			      .on("drag", dragmove));

			  node.append("rect")
			      .attr("height", function(d) { return d.dy; })
			      .attr("width", sankey.nodeWidth())
			      .style("fill", function(d) { 
			    	  if(typeof d.color == 'undefined' || d.color == null)
			    		  d.color = color(d.name.replace(/ .*/, "")); 
			    	  else if(d.fades)
			    		  d.color = ColorLuminance(d.color, Math.random()-.5);
			    	  return d.color; 
			    	  })
			      .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
			    .append("title")
			      .text(function(d) { return d.label + "\n" + format(d.value); });

			  node.append("text")
			      .attr("x", -6)
			      .attr("y", function(d) { return d.dy / 2; })
			      .attr("dy", ".35em")
			      .attr("text-anchor", "end")
			      .attr("transform", null)
			      .text(function(d) { return d.label; })
			    .filter(function(d) { return d.x < width / 2; })
			      .attr("x", 6 + sankey.nodeWidth())
			      .attr("text-anchor", "start");

			  function dragmove(d) {
			    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
			    sankey.relayout();
			    link.attr("d", path);
			  }				
				
				
				
			
			});

	
			function ColorLuminance(hex, lum) {
				// validate hex string
				hex = String(hex).replace(/[^0-9a-f]/gi, '');
				if (hex.length < 6) {
					hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
				}
				lum = lum || 0;

				// convert to decimal and change luminosity
				var rgb = "#", c, i;
				for (i = 0; i < 3; i++) {
					c = parseInt(hex.substr(i*2,2), 16);
					c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
					rgb += ("00"+c).substr(c.length);
				}

				return rgb;
			}

			
	


		}
	};
});

d3.sankey = function() {
	  var sankey = {},
	      nodeWidth = 24,
	      nodePadding = 8,
	      size = [1, 1],
	      nodes = [],
	      links = [];

	  sankey.nodeWidth = function(_) {
	    if (!arguments.length) return nodeWidth;
	    nodeWidth = +_;
	    return sankey;
	  };

	  sankey.nodePadding = function(_) {
	    if (!arguments.length) return nodePadding;
	    nodePadding = +_;
	    return sankey;
	  };

	  sankey.nodes = function(_) {
	    if (!arguments.length) return nodes;
	    nodes = _;
	    return sankey;
	  };

	  sankey.links = function(_) {
	    if (!arguments.length) return links;
	    links = _;
	    return sankey;
	  };

	  sankey.size = function(_) {
	    if (!arguments.length) return size;
	    size = _;
	    return sankey;
	  };

	  sankey.layout = function(iterations) {
	    computeNodeLinks();
	    computeNodeValues();
	    computeNodeBreadths();
	    computeNodeDepths(iterations);
	    computeLinkDepths();
	    return sankey;
	  };

	  sankey.relayout = function() {
	    computeLinkDepths();
	    return sankey;
	  };

	  sankey.link = function() {
	    var curvature = .5;

	    function link(d) {
	      var x0 = d.source.x + d.source.dx,
	          x1 = d.target.x,
	          xi = d3.interpolateNumber(x0, x1),
	          x2 = xi(curvature),
	          x3 = xi(1 - curvature),
	          y0 = d.source.y + d.sy + d.dy / 2,
	          y1 = d.target.y + d.ty + d.dy / 2;
	      return "M" + x0 + "," + y0
	           + "C" + x2 + "," + y0
	           + " " + x3 + "," + y1
	           + " " + x1 + "," + y1;
	    }

	    link.curvature = function(_) {
	      if (!arguments.length) return curvature;
	      curvature = +_;
	      return link;
	    };

	    return link;
	  };

	  // Populate the sourceLinks and targetLinks for each node.
	  // Also, if the source and target are not objects, assume they are indices.
	  function computeNodeLinks() {
	    nodes.forEach(function(node) {
	      node.sourceLinks = [];
	      node.targetLinks = [];
	    });
	    links.forEach(function(link) {
	      var source = link.source,
	          target = link.target;
	      if (typeof source === "number") source = link.source = nodes[link.source];
	      if (typeof target === "number") target = link.target = nodes[link.target];
	      source.sourceLinks.push(link);
	      target.targetLinks.push(link);
	    });
	  }

	  // Compute the value (size) of each node by summing the associated links.
	  function computeNodeValues() {
	    nodes.forEach(function(node) {
	      node.value = Math.max(
	        d3.sum(node.sourceLinks, value),
	        d3.sum(node.targetLinks, value)
	      );
	    });
	  }

	  // Iteratively assign the breadth (x-position) for each node.
	  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
	  // nodes with no incoming links are assigned breadth zero, while
	  // nodes with no outgoing links are assigned the maximum breadth.
	  function computeNodeBreadths() {
	    var remainingNodes = nodes,
	        nextNodes,
	        x = 0;

	    while (remainingNodes.length) {
	      nextNodes = [];
	      remainingNodes.forEach(function(node) {
	        node.x = x;
	        node.dx = nodeWidth;
	        node.sourceLinks.forEach(function(link) {
	          if (nextNodes.indexOf(link.target) < 0) {
	            nextNodes.push(link.target);
	          }
	        });
	      });
	      remainingNodes = nextNodes;
	      ++x;
	    }

	    //
	    moveSinksRight(x);
	    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
	  }

	  function moveSourcesRight() {
	    nodes.forEach(function(node) {
	      if (!node.targetLinks.length) {
	        node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
	      }
	    });
	  }

	  function moveSinksRight(x) {
	    nodes.forEach(function(node) {
	      if (!node.sourceLinks.length) {
	        node.x = x - 1;
	      }
	    });
	  }

	  function scaleNodeBreadths(kx) {
	    nodes.forEach(function(node) {
	      node.x *= kx;
	    });
	  }

	  function computeNodeDepths(iterations) {
	    var nodesByBreadth = d3.nest()
	        .key(function(d) { return d.x; })
	        .sortKeys(d3.ascending)
	        .entries(nodes)
	        .map(function(d) { return d.values; });

	    //
	    initializeNodeDepth();
	    resolveCollisions();
	    for (var alpha = 1; iterations > 0; --iterations) {
	      relaxRightToLeft(alpha *= .99);
	      resolveCollisions();
	      relaxLeftToRight(alpha);
	      resolveCollisions();
	    }

	    function initializeNodeDepth() {
	      var ky = d3.min(nodesByBreadth, function(nodes) {
	        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
	      });

	      nodesByBreadth.forEach(function(nodes) {
	        nodes.forEach(function(node, i) {
	          node.y = i;
	          node.dy = node.value * ky;
	        });
	      });

	      links.forEach(function(link) {
	        link.dy = link.value * ky;
	      });
	    }

	    function relaxLeftToRight(alpha) {
	      nodesByBreadth.forEach(function(nodes, breadth) {
	        nodes.forEach(function(node) {
	          if (node.targetLinks.length) {
	            var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
	            node.y += (y - center(node)) * alpha;
	          }
	        });
	      });

	      function weightedSource(link) {
	        return center(link.source) * link.value;
	      }
	    }

	    function relaxRightToLeft(alpha) {
	      nodesByBreadth.slice().reverse().forEach(function(nodes) {
	        nodes.forEach(function(node) {
	          if (node.sourceLinks.length) {
	            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
	            node.y += (y - center(node)) * alpha;
	          }
	        });
	      });

	      function weightedTarget(link) {
	        return center(link.target) * link.value;
	      }
	    }

	    function resolveCollisions() {
	      nodesByBreadth.forEach(function(nodes) {
	        var node,
	            dy,
	            y0 = 0,
	            n = nodes.length,
	            i;

	        // Push any overlapping nodes down.
	        nodes.sort(ascendingDepth);
	        for (i = 0; i < n; ++i) {
	          node = nodes[i];
	          dy = y0 - node.y;
	          if (dy > 0) node.y += dy;
	          y0 = node.y + node.dy + nodePadding;
	        }

	        // If the bottommost node goes outside the bounds, push it back up.
	        dy = y0 - nodePadding - size[1];
	        if (dy > 0) {
	          y0 = node.y -= dy;

	          // Push any overlapping nodes back up.
	          for (i = n - 2; i >= 0; --i) {
	            node = nodes[i];
	            dy = node.y + node.dy + nodePadding - y0;
	            if (dy > 0) node.y -= dy;
	            y0 = node.y;
	          }
	        }
	      });
	    }

	    function ascendingDepth(a, b) {
	      return a.y - b.y;
	    }
	  }

	  function computeLinkDepths() {
	    nodes.forEach(function(node) {
	      node.sourceLinks.sort(ascendingTargetDepth);
	      node.targetLinks.sort(ascendingSourceDepth);
	    });
	    nodes.forEach(function(node) {
	      var sy = 0, ty = 0;
	      node.sourceLinks.forEach(function(link) {
	        link.sy = sy;
	        sy += link.dy;
	      });
	      node.targetLinks.forEach(function(link) {
	        link.ty = ty;
	        ty += link.dy;
	      });
	    });

	    function ascendingSourceDepth(a, b) {
	      return a.source.y - b.source.y;
	    }

	    function ascendingTargetDepth(a, b) {
	      return a.target.y - b.target.y;
	    }
	  }

	  function center(node) {
	    return node.y + node.dy / 2;
	  }

	  function value(link) {
	    return link.value;
	  }

	  return sankey;
	};
yuccaWidgetsModule.directive('treemapChart', function() {
	return {
		restrict : 'E',
		scope:{data :'=', showLegend:"@"},
		template: '<div id="treemapPanel{{panelIndex}}"></div>'+
				'<div class="legend" ng-show="legendColors.length>0">'+
				'<span class="legend-label">0</span>' +
				'<span ng-repeat="c in legendColors track by $index" class="legend-bullet" style="background-color: {{c}}">{{cc}}</span>' +
				'<span class="legend-label">100</span>' +
				'</div>',
		link : function(scope, elem, attr) {
			console.debug("Treemap - attr", attr);
			console.debug("Treemap - elem", elem);
			console.debug("Treemap - scope", scope);
			var showLegend = true;
			if(scope.showLegend == "false")
				showLegend = false;

			scope.panelIndex  = Math.floor((Math.random() * 10000) + 1); 
			var margin = {top : 30, right : 0, bottom : 0, left : 0};
			//var width = 500;
			//var height = 500;
			//height = height - margin.top - margin.bottom;
			scope.$watch('data', function() {
				
				var width = (typeof attr.width == 'undefined' || attr.width == null) ? 500: parseInt(attr.width);
				var height = (typeof attr.height == 'undefined' || attr.height == null) ? 500: parseInt(attr.height);

				height = height - margin.top - margin.bottom;
				var root=scope.data;
				scope.legendColors = [];
				if(root !=null){
					var transitioning;
	
					var x = d3.scale.linear().domain([ 0, width ]).range([ 0, width ]);
	
					var y = d3.scale.linear().domain([ 0, height ]).range([ 0, height ]);
	
					var treemap = d3.layout.treemap().children(function(d, depth) {
						return depth ? null : d._children;
					}).sort(function(a, b) {
						return a.value - b.value;
					}).ratio(height / width * 0.5 * (1 + Math.sqrt(5))).round(false);
	
					d3.select("#treemapPanel"+scope.panelIndex+" svg").remove();
					var svg = d3.select("#treemapPanel"+scope.panelIndex).append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.bottom + margin.top)
							.style("margin-left", -margin.left + "px").style("margin.right", -margin.right + "px").append("g").attr("transform",
									"translate(" + margin.left + "," + margin.top + ")").style("shape-rendering", "crispEdges");
	
					var grandparent = svg.append("g").attr("class", "grandparent");
	
					grandparent.append("rect").attr("y", -margin.top).attr("width", width).attr("height", margin.top);
	
					grandparent.append("text").attr("x", 8).attr("y", 8 - margin.top).attr("dy", ".75em");
					
					var initialize = function(root) {
						root.x = root.y = 0;
						root.dx = width;
						root.dy = height;
						root.depth = 0;
					};
	
					var accumulate = function(d) {
						return (d._children = d.children) ? d.value = d.children.reduce(function(p, v) {
							return p + accumulate(v);
						}, 0) : d.value;
					};
	
					var layout = function(d) {
						if (d._children) {
							treemap.nodes({
								_children : d._children
							});
							d._children.forEach(function(c) {
								c.x = d.x + c.x * d.dx;
								c.y = d.y + c.y * d.dy;
								c.dx *= d.dx;
								c.dy *= d.dy;
								c.parent = d;
								layout(c);
							});
						}
					};
					
					var display = function(d) {
						grandparent.datum(d.parent).on("click", transition).select("text").text(name(d));
	
						var g1 = svg.insert("g", ".grandparent").datum(d).attr("class", "depth");
						var g = g1.selectAll("g").data(d._children).enter().append("g");
	
						g.filter(function(d) {
							return d._children;
						}).classed("children", true).on("click", transition);
	
						g.selectAll(".child").data(function(d) {
							return d._children || [ d ];
						}).enter().append("rect").attr("class", "child").attr("style",function(d){return color(d);}).call(rect);
	
						g.append("rect").attr("class", "parent").attr("style",function(d){return color(d);}).call(rect).append("title").text(function(d) {
							return tooltip(d);
						});
						
						g.append("text").attr("dy", ".75em").attr("style",function(d){return textColor(d);}).call(text);
						
						function transition(d) {
							if (transitioning || !d)
								return;
							transitioning = true;
	
							var g2 = display(d), t1 = g1.transition().duration(750), t2 = g2.transition().duration(750);
	
							// Update the domain only after entering new elements.
							x.domain([ d.x, d.x + d.dx ]);
							y.domain([ d.y, d.y + d.dy ]);
	
							// Enable anti-aliasing during the transition.
							svg.style("shape-rendering", null);
	
							// Draw child nodes on top of parent nodes.
							svg.selectAll(".depth").sort(function(a, b) {
								return a.depth - b.depth;
							});
	
							// Fade-in entering text.
							g2.selectAll("text").style("fill-opacity", 0);
	
							// Transition to the new view.
							t1.selectAll("text").call(text).style("fill-opacity", 0);
							t2.selectAll("text").call(text).style("fill-opacity", 1);
							t1.selectAll("rect").call(rect);
							t2.selectAll("rect").call(rect);
	
							// Remove the old node when the transition is finished.
							t1.remove().each("end", function() {
								svg.style("shape-rendering", "crispEdges");
								transitioning = false;
							});
							
							//if(typeof d._children != 'undefined' && typeof d._children.length != 'undefined' &&  d._children.length>0 && 
							//		typeof d._children[0] != 'undefined' && typeof d._children[0]._children == 'undefined'){
							if(typeof d.parent != 'undefined' && showLegend){
								scope.legendColors = [];
								var startColor = d.color?d.color:d.parent.color;
								for (var i = 0; i < 5; i++) {
									var lum = i*.9/2 -0.9;
									
									var color = ColorLuminance(startColor, lum);
									scope.legendColors.push(color);
								}
							}
							else
								scope.legendColors = [];
							scope.$apply();
						}
	
						return g;
					};
					
					function tooltip(d){
						var t = d.name.trim() + " - " + d.value.toFixed();
						if(typeof d.label != 'undefined')
							t = d.label;
						if(d.fourthElement){
							try{
								t += " - "+ d.fourthElement.label +": "+ parseFloat(d.fourthElement.value).toFixed(1) + "%";
							}
							catch (e) {
							}
						}
						return t;
					}
					
					function color(d) {
						var c =  d.color? d.color:(d.parent.color?d.parent.color:d.parent.parent.color);
						if(d.fourthElement){
							var lum = d.fourthElement.value*0.9/50 -0.9;
							c = ColorLuminance(c,lum);
						}
						return "fill:" +c;
					}
					
					function textColor(d){
						var c =  d.color? d.color:(d.parent.color?d.parent.color:d.parent.parent.color);
						if(d.fourthElement){
							var lum = d.fourthElement.value*0.9/50 -0.9;
							c = ColorLuminance(c,lum);
						}
						return "fill: " +guessForegroundColor(c);
					}
					
					function guessForegroundColor(color){
						var rgb = parseInt(color.replace('#', ''), 16);   // convert rrggbb to decimal
						var r = (rgb >> 16) & 0xff;  // extract red
						var g = (rgb >>  8) & 0xff;  // extract green
						var b = (rgb >>  0) & 0xff;  // extract blue

						var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
						
						var foregroundColor = "#fff";
						if (luma > 164) {
							foregroundColor = "#000";
						}
						return foregroundColor;
					}

	
					function text(text, label) {
						text.attr("x", function(d) {
							return x(d.x) + 6;
						}).attr("y", function(d) {
							return y(d.y) + 6;
						}).text(function(d) {
							var fontWidth = 10;
							var nameLength = d.name.trim().length*fontWidth;
							var label = d.name;
							var width = x(d.x + d.dx) - x(d.x);
							if(width<nameLength){
								var numOfChar = parseInt(width/fontWidth) -1;
								if(numOfChar>3)
									label = d.name.substring(0,numOfChar)+"...";
								else
									label = "";
							}
							return  label;
						});
					}
	
					function rect(rect) {
						rect.attr("x", function(d) {
							return x(d.x);
						}).attr("y", function(d) {
							return y(d.y);
						}).attr("width", function(d) {
							return x(d.x + d.dx) - x(d.x);
						}).attr("height", function(d) {
							return y(d.y + d.dy) - y(d.y);
						});
					}
					
					function name(d) {
						return d.parent ? name(d.parent) + "  -  " + d.name : d.name;
					}

					initialize(root);
					accumulate(root);
					layout(root);
					display(root);
				}
			});

	
			function ColorLuminance(hex, lum) {

				// validate hex string
				hex = String(hex).replace(/[^0-9a-f]/gi, '');
				if (hex.length < 6) {
					hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
				}
				lum = lum || 0;

				// convert to decimal and change luminosity
				var rgb = "#", c, i;
				for (i = 0; i < 3; i++) {
					c = parseInt(hex.substr(i*2,2), 16);
					c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
					rgb += ("00"+c).substr(c.length);
				}

				return rgb;
			}

			
	


		}
	};
});
yuccaWidgetsModule.directive('ngYuccaDatasetBulletChart', ['metadataService','dataService', '$yuccaHelpers', '$timeout', '$compile',
    function (metadataService, dataService,$yuccaHelpers, $timeout, $compile) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/dataset_bullet_chart.html',
        link: function(scope, elem, attr) {
        	console.log("elem", elem);
        	scope.debug = attr.debug==="true"?true:false;
            scope.debugMessages = [];

        	var user_token =  attr.userToken;
            var filter  = attr.filter;
            
            var currentValueColumn =  $yuccaHelpers.attrs.safe(attr.currentValueColumn, null);
            var previousValueColumn =  $yuccaHelpers.attrs.safe(attr.previousValueColumn, null);
            
            var barColors =  scope.$eval(attr.barColors);
            if(typeof barColors == 'undefined' || barColors == null ||barColors==''){
            	barColors = Constants.LINE_CHART_COLORS;
            }
            
            var ranges = scope.$eval(attr.rangeValues, null);
            if(ranges !=null){
            	if(ranges.length!=3){
            		scope.debugMessages.push("Invalid range values: range values must be an array with 3 elements: Min, Mean, Max");
            		ranges = null;
                }
            }

            var rangeColumnValues = scope.$eval(attr.rangeColumnValues, null);
            if(rangeColumnValues !=null){
            	if(rangeColumnValues.length!=3){
            		scope.debugMessages.push("Invalid range column values: range column values must be an array with 3 elements: Column with Min, Column with Mean, Column with Max");
            		rangeColumnValues = null;
                }
            }
            
            var averageValues =  attr.averageValues==="true"?true:false;

            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);
            
            var internalIds =  scope.$eval(attr.internalIds);
            var filterIds = $yuccaHelpers.attrs.safe(attr.filterIds, null);

            var barTitleColumn=  $yuccaHelpers.attrs.safe(attr.barTitleColumn, null);
            var barSubtitleColumn=  $yuccaHelpers.attrs.safe(attr.barSubtitleColumn, null);

            var barTitleLabel=  $yuccaHelpers.attrs.safe(attr.barTitleLabel, null);
            var barSubtitleLabel=  $yuccaHelpers.attrs.safe(attr.barSubtitleLabel, null);

            
            var rangeLabels =  scope.$eval(attr.rangeLabels);
            var measureLabels =  scope.$eval(attr.measureLabels);
            var customMarkers =  scope.$eval(attr.customMarkers);
            var customMarkerColumns =  scope.$eval(attr.customMarkerColumns);
            var markerLabels =  scope.$eval(attr.markerLabels);
            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            var decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };
            
            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, elem[0].offsetWidth);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, elem[0].offsetHeight);



        	var toolTipContentFunction = function(key, x, y, e, graph) {
        		//console.log("too",key, x, y, e, graph)
        		var dataIndex  = key.index;
        			
        		
        		
    			var tooltip="";
    			tooltip += "  <span class='yucca-dataset-bullet-chart-tooltip'>";
    			tooltip += "    <i class='glyphicon glyphicon-stop' style='color:"+key.color+"'></i> " + key.label+ " <strong>"+$yuccaHelpers.render.safeNumber(key.value, decimalValue, scope.isEuroValue())+"</strong></span>";
    			tooltip += "  </span>";
				
    			
    	    	return  tooltip;
    		};
    		
        	

    		var computeRanges = function(){
	    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
	    			var maxData = firstData.d.__count>10000?10000:firstData.d.__count;
	    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,  null /*'internalId%20desc'*/, maxData).then( function(result) {
	    				var sum= 0;
	    				var total = 0;
	    				var min = null;
	    				var max = null;

	    				for(var i=0; i<result.length; i++){
	    					//console.log("  "+result[i]);
	    					//console.log("       " + result[i].data.d.results);
	    					for(var j=0; j<result[i].data.d.results.length; j++){
		    					var value = parseFloat(result[i].data.d.results[j][currentValueColumn]);
		    					if(min == null || value<min) min = value;
		    					if(max == null || value>max) max = value;
		    					sum += value;
		    					total++;
		    				}
	    				}
	    	
	    				ranges.push(min);
	    				ranges.push(sum/total);
	    				ranges.push(max);
	    				console.log("ranges",ranges);
	    				loadIds();
	    				
	
	    			});
	    		});
        	};
        	
        	scope.options = {
    			chart: {
    				type: 'bulletChart',
	                duration: 500,
	                tooltip:{
	                	contentGenerator: toolTipContentFunction
	                },
	                tickFormat:(function (d) { return $yuccaHelpers.render.safeNumber(d, decimalValue, scope.isEuroValue());}),
	                ticks: 2
	            }
	        };
        	
			var colorIndex = 0;

        	var createBulletChart = function(data, chartIndex){
        		console.log("createBulletChart", data);

        		var measures = [];
        		
        		if(rangeColumnValues!=null){
        			ranges =  [parseFloat(data[rangeColumnValues[0]]),parseFloat(data[rangeColumnValues[1]]),parseFloat(data[rangeColumnValues[2]])];
        		}
        		if(data[currentValueColumn]!=null)
        			measures.push(parseFloat(data[currentValueColumn].replace(",",".")));
    			
    			var title = barTitleLabel;
    			if(typeof barTitleColumn != 'undefined' && barTitleColumn!=null && barTitleColumn!=''){
    				title =data[barTitleColumn];
    			}
    			
      			var subtitle = barSubtitleLabel;
    			if(typeof barSubtitleColumn != 'undefined' && barSubtitleColumn!=null && barSubtitleColumn!=''){
    				subtitle =data[barSubtitleColumn];
    			}
    			
                var datasetBulletChartChartId = "bullet_"+chartIndex+"_"+new Date().getTime();


    			var chartData={
    				"chartId": datasetBulletChartChartId,
	        		"title":title,
		            "subtitle": subtitle,
		            "ranges": ranges,
		            "measures": measures,
		            "color": barColors[colorIndex],
    				"markers" : [],
    				"markerLabels":[],
    				"markersControl": []
        		};

    			if(previousValueColumn!=null ){
    				chartData.markers.push(data[previousValueColumn]);
    				chartData.markerLabels.push("Previous");
    			}

    			if(typeof customMarkerColumns != 'undefined' && customMarkerColumns!=null){
    				for (var k = 0; k < customMarkerColumns.length; k++) {
    					chartData.markersControl.push({"marker":customMarkerColumns[k], "show": true});
					}
    			}
    			
    			if(typeof customMarkerColumns != 'undefined' && customMarkerColumns!=null){
    				for (var k = 0; k < customMarkerColumns.length; k++) {
    					chartData.markers.push(data[customMarkerColumns[k]]);
					}
    			}

    			if(typeof rangeLabels != 'undefined' && rangeLabels!=null){
    				chartData.rangeLabels = rangeLabels;
    			}

    			if(typeof measureLabels != 'undefined' && measureLabels!=null){
    				chartData.measureLabels = measureLabels;
    			}

    			if(typeof markerLabels != 'undefined' && markerLabels!=null){
    				for (var k = 0; k < markerLabels.length; k++) {
    					chartData.markerLabels.push(markerLabels[k]);
    					if(typeof chartData.markersControl[k]!= 'undefined')
    						chartData.markersControl[k].label = markerLabels[k];
					}
    			}

    			
    			scope.chartDataArray.push(chartData);
				colorIndex++;
        		if(colorIndex == barColors.length)
        			colorIndex = 0;
        		
        		console.debug("chartData", chartData);

    			scope.isLoading = false;

        	};
        	
        	var loadedData = null;
        	
        	var loadIds = function(){
        		if(internalIds!=null){
        			loadData();
        		}
        		else{
		    		dataService.getDataEntities(attr.datasetCode,user_token,filterIds,  0, 50, null).success(function(result){
		    			console.debug("loadIds",result);
		    			loadedData = result.d.results;
		    			if(result.d.results!=null && result.d.__count>0){
		    				internalIds = [];
		    				for(var i = 0; i<result.d.results.length; i++){
		    					internalIds.push(result.d.results[i].internalId);
		    				}
			    			loadData();
		    			}
		    			else{
		    				scope.infoMessage = "No data found";
			    			scope.isLoading = false;
		    			}
		    		}).error(function(result){
		    			scope.isLoading = false;
		    			console.error("loadIds error",result);
		    			scope.debugMessages.push("Load ids error " +result );
		    		});
        		}
        	};
        	
        	var loadData = function(){
	        	scope.chartDataArray = [];
	        	console.log("loadData",internalIds);
    			var colorIndex = 0;
	        	if(loadedData!=null && loadedData.length>0){
	        		if(averageValues){
	        			var summedData = loadedData[0];
	        			for(var ii=1; ii<loadedData.length; ii++){
	        				summedData[currentValueColumn] = parseFloat(summedData[currentValueColumn]) + parseFloat(loadedData[ii][currentValueColumn]);
	        			}
	        			summedData[currentValueColumn] = summedData[currentValueColumn]/loadedData.length;
	        			createBulletChart(summedData,0);
	        		}
	        		else{
	        			for(var ii=0; ii<loadedData.length; ii++){
	        				createBulletChart(loadedData[ii],ii);

	        			}
	        		}	        		
	        	}
	        	else{
		        	for(var ii=0; ii<internalIds.length; ii++){
		        		dataService.getSingleDataEntities(attr.datasetCode,user_token, internalIds[ii]).then( function(result) {
		        			createBulletChart(result.data.d, ii);
		        		});
		        		
		        	}
	        	}
        	};
        	
        
			scope.isLoading = true;

        	if(ranges!=null || rangeColumnValues!=null){
        		loadIds();
        	}
        	else{
        		ranges = [];
        		computeRanges();
        	}
        	
        	/*
        	scope.toggleMarker = function(chartId, m){
        		console.log("toggleMarker", m);
        		
        		scope.chartDataArray[0].markers.splice(0, 1);
        		console.log("scope.chartDataArray", scope.chartDataArray);
        		//var content = angular.element(document.getElementById(chartId)).contents();
        	   // $timeout(function() {$compile(content)(scope);}, 200);
        	};
        	
        	*/
        	
        	
        	//loadIds();
            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_bullet_chart.html",
    '<div class="yucca-widget yucca-dataset-bullet-chart">\n' +
    '    <header class="yucca-dataset-bullet-chart-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-bullet-chart-content">\n' +
    '        <section >\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-bullet-chart-loading" >\n' +
    '             <div class="yucca-widget-spinner"><div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="infoMessage!=null" class="yucca-chart-info-message" >\n' +
    '             <p>{{infoMessage}}</p>\n' +
    '           </div>\n' +
    '        	<div ng-show="!isLoading" ng-repeat="chartData in chartDataArray track by $index" class="yucca-dataset-bullet-chart-chart" >\n' +
    '        		<!--<div class="yucca-dataset-bullet-chart-marker-controls">\n' +
    '        		  <div class="check-control" ng-repeat="m in chartData.markersControl track by $index">\n' +
    '        		    <div class="check-bullet" ng-click="toggleMarker(chartData.chartId, m)"></div>{{m.label}}\n' +
    '        		  </div>\n' +
    '        		</div>\n' +
    '				<div id="{{chartData.chartId}}"><nvd3 options="options" data="chartData" ></nvd3></div>-->\n' +
    '				<nvd3 options="options" data="chartData" ></nvd3>\n' +
    '				<!--<bullet-chart options="options" data="chartData" width="{{chartWidth}}" height="{{chartHeight}}" ></bullet-chart>-->\n' +
    '       	</div>\n' +
    '        </section>\n' +
    '        <section class="yucca-widget-debug" ng-show="debug && debugMessages.length>0">\n' +
    '          	<ul><li ng-repeat="m in debugMessages track by $index">{{m}}</li></ul>\n' +
    '        </section>\n' +
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetChoroplethMap', ['metadataService','dataService', '$yuccaHelpers', '$http', 'leafletData', '$timeout', '$compile',
    function (metadataService, dataService,$yuccaHelpers,$http,leafletData,$timeout,$compile) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/dataset_choropleth_map.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
            scope.debugMessages = [];

        	var user_token =  attr.userToken;
            var filter  = attr.filter;
            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);
            var datasetCode = $yuccaHelpers.attrs.safe(attr.datasetCode, null);
            if(datasetCode==null ){
        		scope.debugMessages.push("Invalid dataset code");
            }
            
            scope.datasetChoroplethMapMapId = "map"+new Date().getTime();


            
            var geojsonAreasKey =  $yuccaHelpers.attrs.safe(attr.geojsonAreasKey, "name");
            var datasetAreasKeyColumn = $yuccaHelpers.attrs.safe(attr.datasetAreasKeyColumn, null);
            var datasetAreasKeyLabel = $yuccaHelpers.attrs.safe(attr.datasetAreasKeyLabel, datasetAreasKeyColumn);
            var datasetAreasValueColumn = $yuccaHelpers.attrs.safe(attr.datasetAreasValueColumn, null);
			
			var datasetAreasColorColumn = $yuccaHelpers.attrs.safe(attr.datasetAreasColorColumn, null);
			
            var datasetAreasValueLabel = $yuccaHelpers.attrs.safe(attr.datasetAreasValueLabel, datasetAreasValueColumn);
            scope.dataKey = datasetAreasKeyColumn;
            scope.dataValue = datasetAreasValueColumn;
			scope.colorValue = datasetAreasColorColumn;
            var countingMode  = $yuccaHelpers.attrs.safe(attr.countingMode, "count");

            
            if(datasetAreasKeyColumn==null ||datasetAreasValueColumn==null){
        		scope.debugMessages.push("Invalid dataset area indicators: specify the column of the key to match with the geojson, and the column for the value in to use");
            }
            
            
            var mapLineWeight =  $yuccaHelpers.attrs.safe(attr.mapLineWeight, 1);
            var mapLineOpacity =  $yuccaHelpers.attrs.safe(attr.mapLineOpacity, 1);
            var mapLineDashColor =  $yuccaHelpers.attrs.safe(attr.mapLineDashColor, '#0e232e');
            var mapLineDashArray =  $yuccaHelpers.attrs.safe(attr.mapLineDashArray, 1);
            var mapAreasFillOpacity =  $yuccaHelpers.attrs.safe(attr.mapAreasFillOpacity, .7);

            var areaBaseColor =  $yuccaHelpers.attrs.safe(attr.areaBaseColor, "#00bbf0");
            
            var geojsonUrl = $yuccaHelpers.attrs.safe(attr.geojsonUrl, "lib/yucca-angular-widgets/dist/data/piemonte_province_geojson.json");
            
            var mapTilesUrl = $yuccaHelpers.attrs.safe(attr.mapTilesUrl, Constants.MAP_TILES_CARTO_DB_POSITRON_URL);
            scope.mapTiles = {url: mapTilesUrl};
            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            scope.decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };

            
            var geojson_data = null;
            
            var skipZeroValues =  attr.skipZeroValues==="true"?true:false;
            var showLegend =  attr.showLegend==="false"?false:true;
            var legendPosition =  $yuccaHelpers.attrs.safe(attr.legendPosition, 'bottomleft');
           
            var zoomControl = attr.zoomControl==="false"?false:true;
            var scrollWheelZoom = attr.scrollWheelZoom==="false"?false:true;
            //scope.mapControls = {"zoomControl": showZoomControl}
            scope.defaults = {
            		zoomControl: zoomControl,
            		scrollWheelZoom: scrollWheelZoom
            }
            
            var maxValue = null;
            var minValue = null;
            scope.geojson= null;
            var mapLatLngs = null;
            scope.tableData = [];
			scope.isLoading = true;

            $http.get(geojsonUrl).success(function(data) {
            	geojson_data = data;
            	mapLatLngs = computeBound(geojson_data.features);
            	
	    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
	    			var maxData = firstData.d.__count>10000?10000:firstData.d.__count;
	    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,  null /*'internalId%20desc'*/, maxData).then( function(result) {
	                  console.debug("choropleth:loadData", result);
	    			  var data = [];
	    			  var total = 0;
	    			  for(var i=0; i<result.length; i++){
    					total = result[i].data.d.__count;
    					for(var j=0; j<result[i].data.d.results.length; j++){
    						data.push(result[i].data.d.results[j]);
    					}
	    			  }

	                  if(data.length>0){
	                    for(var j=0; j<data.length; j++){
	                      var d = data[j];
	                      for(var k=0; k<geojson_data.features.length;k++){
	                        if(d[datasetAreasKeyColumn] == geojson_data.features[k].properties[geojsonAreasKey]){
	                        	if(typeof geojson_data.features[k].properties.value == 'undefined')
	                        		geojson_data.features[k].properties.value = 0;
	                        	if(countingMode == "count")
	                        		geojson_data.features[k].properties.value++;
	                        	else if (d[datasetAreasValueColumn]>0)
	                        		geojson_data.features[k].properties.value = d[datasetAreasColorColumn];
	                        }
	                      }
	                    }
	                    // compute statistic
						/*
	                    for(var m=0; m<geojson_data.features.length; m++){
		                    scope.tableData.push({"key": geojson_data.features[m].properties[geojsonAreasKey], "value": geojson_data.features[m].properties.value});
		                    if(geojson_data.features[m].properties.value!=0){
		                      if(maxValue==null || geojson_data.features[m].properties.value>maxValue)
		                        maxValue = geojson_data.features[m].properties.value;
		                      if(minValue==null || geojson_data.features[m].properties.value<minValue)
		                        minValue = geojson_data.features[m].properties.value;
		                    }
	                    }
						maxValue = 80000;
						minValue = 0;*/
	                    scope.geojson= {};
	                    console.debug("geojson_data",geojson_data);
	                    scope.geojson.data = geojson_data;
	                    scope.geojson.style = styleChoroplethMap;
	                    scope.geojson.onEachFeature = onEachChoroplethMapFeature;
	                    leafletData.getMap(scope.datasetChoroplethMapMapId).then(function(map) {
	                    	map.fitBounds(mapLatLngs);
	                    });
	                    if(showLegend)
	                    	createLegend();
	                    
	                  }
	      			  scope.isLoading = false;
	
	                }, function(result){
		    			scope.isLoading = false;
		    			console.error("Load data error",result);
		    			scope.debugMessages.push("Load data error " +result );
		    		});

	           }).error(function(result){
	   				scope.isLoading = false;
	   				console.error("Load data error",result);
	   				scope.debugMessages.push("Load data error " +result );
	           });
            }).error(function(result){
   				scope.isLoading = false;
   				console.error("Load geojson error",result);
   				scope.debugMessages.push("Load geojson error " +result );
           });
            
           var computeBound = function(features){
               var latlngs = [];
               for (var k in features) {
                  if(features[k].geometry.type=="MultiPolygon"){
                	  for(var m in features[k].geometry.coordinates)
                		  for (var i in features[k].geometry.coordinates[m]){
                			  var coord = features[k].geometry.coordinates[m][i];
                			  for (var j in coord) 
                     			latlngs.push(L.GeoJSON.coordsToLatLng(coord[j]));
                		  }
                  }
                  else{
   	               	for (var i in features[k].geometry.coordinates) {
   	               		var coord = features[k].geometry.coordinates[i];
   	               		for (var j in coord) 
                  			latlngs.push(L.GeoJSON.coordsToLatLng(coord[j]));
   	               	}
                	  
                  }
               }
               return latlngs;

           };
           
		   
		
		
		   
		   var createLegend = function(){
            	 var legendColors = [];
            	 var legendLabels = [];
       
//            	 var step = (maxValue - minValue)/4;
				 
//            	 for(var i=0;i<3; i++){
/*                	 var percent = -1.8*(i-2);
                    
	            	 legendColors.push($yuccaHelpers.render.colorLuminance(areaBaseColor, percent));
	            	 if(i==0)
	            		 legendLabels.push("<" + $yuccaHelpers.render.safeNumber(step+minValue, scope.decimalValue, scope.isEuroValue()));
	            	 else if(i==3-1)
	            		 legendLabels.push(">" + $yuccaHelpers.render.safeNumber(maxValue-step, scope.decimalValue, scope.isEuroValue()));
	            	 else
	            		 legendLabels.push("" + $yuccaHelpers.render.safeNumber(minValue + step*i, scope.decimalValue, scope.isEuroValue()) + " - " + $yuccaHelpers.render.safeNumber(minValue + step*(i+1), scope.decimalValue, scope.isEuroValue()));

            		 
            	 }

*/
            	 legendColors.push(getChoropletColor("SMALL"));
           		// legendLabels.push("<=" + $yuccaHelpers.render.safeNumber(10000, scope.decimalValue, scope.isEuroValue()));
				 legendLabels.push("SMALL");
            	 legendColors.push(getChoropletColor("MEDIUM"));
           		/* legendLabels.push("" + $yuccaHelpers.render.safeNumber(10000, scope.decimalValue, scope.isEuroValue())
								   + " - " +
								   "" + $yuccaHelpers.render.safeNumber(80000, scope.decimalValue, scope.isEuroValue())
				 );*/
				 legendLabels.push("MEDIUM");
            	 legendColors.push(getChoropletColor("BIG"));
           		// legendLabels.push(">" + $yuccaHelpers.render.safeNumber(80000, scope.decimalValue, scope.isEuroValue()));
				 legendLabels.push("BIG");

                 scope.legend =  {
                         position: legendPosition,
                         colors: legendColors,
                         labels: legendLabels
                     };
            	 
             };
		 
		   
           var styleChoroplethMap = function(feature) {
              return {fillColor: getChoropletColor(feature.properties.value),weight: mapLineWeight, opacity: mapLineOpacity, color: mapLineDashColor, dashArray: mapLineDashArray,fillOpacity:  mapAreasFillOpacity};
           };

           var getChoropletColor = function(d) {
               if(d == "None"){
                   return "#FFF";
               }
               else {
				 if (d == "SMALL")
					return $yuccaHelpers.render.colorLuminance(areaBaseColor, -0.8);
				 else if (d == "MEDIUM")
					return $yuccaHelpers.render.colorLuminance(areaBaseColor, 0);
				 else if (d == "BIG")
					return $yuccaHelpers.render.colorLuminance(areaBaseColor, 0.8);
				else return "#FFF";
               }
               
           };
           
           var onEachChoroplethMapFeature = function(feature, layer) {
               layer.on({
                   mouseover: highlightFeature,
                   mouseout: resetHighlight
              });
           };
           
           scope.info = {"show": false}
           function highlightFeature(e) {
               var layer = e.target;
               layer.setStyle({weight: 5, dashArray: '', fillOpacity: 0.7});
               if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) 
            	   layer.bringToFront();
               scope.info.top = e.layerPoint.y;
               scope.info.left = e.layerPoint.x;
               var val = $yuccaHelpers.render.safeNumber(layer.feature.properties.value, scope.decimalValue, scope.isEuroValue());
          
               scope.info.content = "<strong>" + datasetAreasKeyLabel + "</strong>: " + layer.feature.properties[geojsonAreasKey] + " <br><strong>" + datasetAreasValueLabel  +"</strong>: " + val;
               
               scope.info.show = true;
             };

             function resetHighlight(e) {
            	 var layer = e.target;
               layer.setStyle({weight: mapLineWeight, opacity: mapLineOpacity, color: mapLineDashColor, dashArray: mapLineDashArray,fillOpacity:  mapAreasFillOpacity});
               scope.info.show = false;
               //$scope.selected= null;
             };
             
             
             

        	//loadIds();
            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
        	scope.MAP_PIEDMONT_CENTER =  {lat: 45.3522366, lng: 7.515388499999972, zoom: 7};


        }

    };
}]);




yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_choropleth_map.html",
    '<div class="yucca-widget yucca-dataset-choropleth-map">\n' +
    '    <header class="yucca-dataset-choropleth-map-header">\n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-choropleth-map-content" ng-init="panel=\'map\'">\n' +
    '      <section class="yucca-dataset-choropleth-map-section" ng-show="panel==\'map\'" >\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-choropleth-map-loading" >\n' +
    '             <div class="yucca-widget-spinner"><div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <leaflet ng-attr-id="{{datasetChoroplethMapMapId}}"  defaults="defaults" tiles="mapTiles" bounds="mapBounds" geojson="geojson" class="yucca-dataset-choropleth-map-map" ng-if="geojson!=null" legend="legend" controls="mapControls"></leaflet>\n' + 
    '           <div class="info-panel" ng-show="info.show" style="top:{{info.top}}px; left:{{info.left}}px"><span ng-bind-html="info.content"></span></div>  '+ 
    '        </section>\n' + 
    '        <section class="yucca-dataset-choropleth-map-data" ng-show="panel==\'data\'">\n' +
    '           <table class="yucca-dataset-choropleth-map-table">\n'+
    '               <thead><tr><th>{{dataKey}}</th><th>{{dataValue}}</th></tr>\n' +
    '               </thead>\n' +
    '               <tbody ng-repeat="row in tableData track by $index" >\n' +
    '                   <tr>\n' +
    '                     <td class="yucca-dataset-choropleth-map-data-key">{{row.key}}</td>\n' +
    '                     <td class="yucca-dataset-choropleth-map-data-value">{{row.value|safeNumber:decimalValue:isEuroValue()}}</td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-widget-debug" ng-show="debug && debugMessages.length>0">\n' +
    '          	<ul><li ng-repeat="m in debugMessages track by $index">{{m}}</li></ul>\n' +
    '        </section>\n' +
    '        <div class="yucca-dataset-choropleth-map-toolbar">\n' +
    '            <a href ng-click="panel=\'map\'" ng-class="{active: panel == \'chart\'}">Map</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </div>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetForceDirectedChart', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'AE',
        scope: {},
        templateUrl:'template/force_directed_chart.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, "Sankey");
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            var chartTitle = $yuccaHelpers.attrs.safe(attr.chartTitle, attr.datasetCode);
            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, elem[0].offsetWidth);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, elem[0].offsetHeight);

            var sankeyNodeColumns = scope.$eval(attr.nodeColumns);
            var sankeyNodeRender = scope.$eval(attr.sankeyNodeRender);
            var baseColor = $yuccaHelpers.attrs.safe(attr.baseColor, null);

        	console.log("sankeyNodeColumns - data",sankeyNodeColumns);
            var sankeyNodesParam = scope.$eval(attr.sankeyNodes);
            var sankeyLinksParam = scope.$eval(attr.sankeyLinks);

            var countingMode  = $yuccaHelpers.attrs.safe(attr.countingMode, "count");
            var valueColumn = $yuccaHelpers.attrs.safe(attr.valueColumn, null);
            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            var decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };

        	scope.sankeyData ={"nodes":[], "links": []};
            
            var compactDataForSankey = function(data){
            	console.debug("compactDataForSankey - data",data);
            	var uniqueNode = {};
            	var sankeyNodes = [];
            	var sankeyMatrix = [];
            	var sankeyLinks = [];
            	var sankeyLinksDictionary = [];
            	var nodeIndex = 0;
            	for(var i=0; i<data.data.length; i++){
            		for(var j=0; j<sankeyNodeColumns.length; j++){
            			if(typeof(sankeyMatrix[sankeyNodeColumns[j]]) == "undefined")
            				sankeyMatrix[sankeyNodeColumns[j]] = [];
	            		if( typeof(uniqueNode[sankeyNodeColumns[j] +"_"+data.data[i][sankeyNodeColumns[j]]]) == "undefined"){
	            			var node = {"name": ""+data.data[i][sankeyNodeColumns[j]], "index": nodeIndex, "label": ""+data.data[i][sankeyNodeColumns[j]], "color": baseColor,"fades":true, "group":j};
	            			if(typeof sankeyNodeRender!= 'undefined' && typeof sankeyNodeRender[sankeyNodeColumns[j]+"_"+node.name] != 'undefined'){
	            				var render = sankeyNodeRender[sankeyNodeColumns[j]+"_"+node.name];
	            				if(typeof render.label!=undefined)
	            					node.label = render.label;
	            				if(typeof render.color!=undefined)
	            					node.color = render.color;
	            				if(render.fades=="true")
	            					node.fades = true;
	            				else
	            					node.fades = false;
	            			}
	            			sankeyNodes.push(node);
	            			sankeyMatrix[sankeyNodeColumns[j]].push({"node":data.data[i][sankeyNodeColumns[j]],"index": nodeIndex});
	            			nodeIndex++;
	            		}
	            		uniqueNode[sankeyNodeColumns[j] +"_"+data.data[i][sankeyNodeColumns[j]]] = 0;
            		}
            	}
            	console.debug("sankeyNodes", sankeyNodes);
            	console.debug("sankeyMatrix", sankeyMatrix);
            	
              	for(var i=0; i<data.data.length; i++){
            		for(var j=0; j<sankeyNodeColumns.length; j++){
            			if(j<sankeyNodeColumns.length-1){
            				var key= sankeyNodeColumns[j];
	            			for(var k=0; k<sankeyMatrix[key].length; k++){
	            				var source = sankeyMatrix[key][k];
	    						for(var m=0; m<sankeyMatrix[sankeyNodeColumns[j+1]].length; m++){
	    							var target = sankeyMatrix[sankeyNodeColumns[j+1]][m];
	    							if(typeof(sankeyLinksDictionary[key+"|"+source.node+"|"+target.node]) == "undefined")
	    	            				sankeyLinksDictionary[key+"|"+source.node+"|"+target.node] = {"source": source.index, "target":target.index, "value": 0};
	    							if(data.data[i][sankeyNodeColumns[j]] == source.node && data.data[i][sankeyNodeColumns[j+1]]  == target.node){
	    								var add = countingMode=='sum'?parseFloat(data.data[i][valueColumn]):1;
	    								sankeyLinksDictionary[key+"|"+source.node+"|"+target.node].value += add;
	    							}
	    						}
	            			}
            						
            			}
            					
            		}
            				
            	}
              	
              	

       		
            	
            	console.debug("sankeyLinksDictionary", sankeyLinksDictionary);
                for(var key in sankeyLinksDictionary){
                	if(sankeyLinksDictionary[key].value!=0)
                		sankeyLinks.push(sankeyLinksDictionary[key]);
                }
                
            	scope.sankeyData ={"nodes":sankeyNodes, "links": sankeyLinks};
            	
            	console.debug("sankeyData", scope.sankeyData);

            };
            if(typeof sankeyNodesParam == 'undefined' || sankeyNodesParam == null || sankeyNodesParam =="" ||
            	typeof sankeyLinksParam == 'undefined' || sankeyLinksParam == null || sankeyLinksParam =="" ){
    			scope.isLoading = true;

	    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
	    			var maxData = firstData.d.__count>10000?10000:firstData.d.__count;
	    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,  null /*'internalId%20desc'*/, maxData).then( function(result) {
	    				var data = [];
	    				var total = 0;
	    				for(var i=0; i<result.length; i++){
	    					total = result[i].data.d.__count;
	    					for(var j=0; j<result[i].data.d.results.length; j++){
	    						data.push(result[i].data.d.results[j]);
	    					}
	    				}
	    				compactDataForSankey({"total":total,"data":data});
	    				scope.isLoading = false;

	
	    			},function(result) {
	    				console.log("getMultipleDataEnties error", data);
	    				scope.isLoading = false;
	    			});
	    		}).error(function(data){
	    			console.log("getDataEntities error", data);
    				scope.isLoading = false;
	    		});
            }
            else{
            	scope.sankeyData ={"nodes":sankeyNodesParam, "links": sankeyLinksParam};
            }

            var color = d3.scale.category20()

            scope.options = {
                    chart: {
                        type: 'forceDirectedGraph',
                        height: 450,
                        width: scope.chartWidth,
                        margin:{top: 20, right: 20, bottom: 20, left: 20},
                        color: function(d){
                            return color(d.group)
                        },
                        nodeExtras: function(node) {
                            node && node
                              .append("text")
                              .attr("dx", 8)
                              .attr("dy", ".35em")
                              .text(function(d) { return d.name })
                              .style('font-size', '10px');
                        }
                    }
                };
            
            console.log("attrs", attr);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/force_directed_chart.html",
    '<div class="yucca-widget yucca-dataset-sankey">\n' +
    '    <header class="yucca-dataset-sankey-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-sankey-content">\n' +
    '        <section class="yucca-dataset-sankey-chart">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-sankey-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="chartMessage != null" class="yucca-dataset-sankey-chart-message" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px">Loading&hellip;</div>\n' +
    '			<nvd3 ng-show="!isLoading &&  chartMessage == null " options="options" data="sankeyData" class="with-3d-shadow with-transitions"></nvd3>	\n' +
    '        	<sankey-chart ng-show="!isLoading &&  chartMessage == null "data="sankeyData" width="{{chartWidth}}" height="{{chartHeight}}"></sankey-chart>\n' +
    '        </section>\n' +
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetForcedirectedChart', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'AE',
        scope: {},
        templateUrl:'template/forcedirected_chart.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, "Force Directed");
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            var chartTitle = $yuccaHelpers.attrs.safe(attr.chartTitle, attr.datasetCode);
            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, elem[0].offsetWidth);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, elem[0].offsetHeight);

            var forcedirectedNodeColumns = scope.$eval(attr.nodeColumns);
            var forcedirectedNodeLabels = scope.$eval(attr.nodeLabels);
            if(typeof forcedirectedNodeLabels == 'undefined' )
            	forcedirectedNodeLabels = forcedirectedNodeColumns;
            var forcedirectedNodeTypeColumn = $yuccaHelpers.attrs.safe(attr.nodeTypeColumn, null);
            var forcedirectedNodeRender = scope.$eval(attr.forcedirectedNodeRender);
            
            

            var baseColor = $yuccaHelpers.attrs.safe(attr.baseColor, null);

            scope.nodeIcon = $yuccaHelpers.attrs.safe(attr.nodeIcon, null);
            scope.linkLine = $yuccaHelpers.attrs.safe(attr.linkLine, null);

            scope.linkLength = $yuccaHelpers.attrs.safe(attr.linkLength, null);
            scope.nodeSize = $yuccaHelpers.attrs.safe(attr.nodeSize, null);
            scope.nodeTypeIcon = $yuccaHelpers.attrs.safe(attr.nodeTypeIcon, null);
            console.log("scope.nodeTypeIcon",scope.nodeTypeIcon);
            scope.computeStatistic = $yuccaHelpers.attrs.safe(attr.computeStatistic, false);

            
        	console.log("forcedirectedNodeColumns - data",forcedirectedNodeColumns);
            var forcedirectedNodesParam = scope.$eval(attr.forcedirectedNodes);
            var forcedirectedLinksParam = scope.$eval(attr.forcedirectedLinks);


        	scope.forcedirectedLinks =  [];
        	var forcedirectedLinks = {};
            
        	var compactDataForForcedirected = function(data){
            	console.log("forcedirectedNodeColumns",forcedirectedNodeColumns);
            	for(var i=0; i<data.data.length; i++){
            		for(var j=0; j<forcedirectedNodeColumns.length; j++){
            			var group = forcedirectedNodeTypeColumn==null?"-":data.data[i][forcedirectedNodeTypeColumn];
            			createLink(j,data.data[i], group);
            		}
            	}
            	console.log("forcedirectedLinks",forcedirectedLinks);
            	for( var key in forcedirectedLinks ) {
            	    if (forcedirectedLinks.hasOwnProperty(key)){
            	    	scope.forcedirectedLinks.push(forcedirectedLinks[key]);
            	    }
            	}
            	
        	};
        	
        	var createLink = function(currentIndex, data, group){
        		for(var k=0; k<forcedirectedNodeColumns.length; k++){
        			if(k!=currentIndex){
		        		var key = data[forcedirectedNodeColumns[currentIndex]] + "_" + data[forcedirectedNodeColumns[k]] + "_" + group;
		    			
		        		if(typeof forcedirectedLinks[key] == 'undefined'){
		        			forcedirectedLinks[key]={
		        					"source": data[forcedirectedNodeColumns[currentIndex]], 
		        					"target": data[forcedirectedNodeColumns[k]], 
		        					"type": group, 
		        					"sourceType": forcedirectedNodeColumns[currentIndex], 
		        					"targetType": forcedirectedNodeColumns[k],
		        					//"sourceColumn": forcedirectedNodeColumns[currentIndex], 
		        					//"targetColumn": forcedirectedNodeColumns[k],
		        					"sourceLabel" : (typeof forcedirectedNodeLabels[currentIndex] == 'undefined'?forcedirectedNodeColumns[currentIndex]: forcedirectedNodeLabels[currentIndex]),
			            			"targetLabel" : (typeof forcedirectedNodeLabels[k] == 'undefined'?forcedirectedNodeColumns[k]: forcedirectedNodeLabels[k]),
			            			"count": 1
		        							
		        			};
		        		}
		        		else
		        			forcedirectedLinks[key].count++;
        			}
        		}
        	};
        	
        	//{source:"Hulk", sourceType: "Character",target:"The Incredible Hulk", targetType: "Movie",type:"Main"}
        	
            if(typeof forcedirectedNodesParam == 'undefined' || forcedirectedNodesParam == null || forcedirectedNodesParam =="" ||
            	typeof forcedirectedLinksParam == 'undefined' || forcedirectedLinksParam == null || forcedirectedLinksParam =="" ){
    			scope.isLoading = true;

	    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
	    			var maxData = firstData.d.__count>10000?10000:firstData.d.__count;
	    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,  null /*'internalId%20desc'*/, maxData).then( function(result) {
	    				var data = [];
	    				var total = 0;
	    				for(var i=0; i<result.length; i++){
	    					total = result[i].data.d.__count;
	    					for(var j=0; j<result[i].data.d.results.length; j++){
	    						data.push(result[i].data.d.results[j]);
	    					}
	    				}
	    				compactDataForForcedirected({"total":total,"data":data});
	    				scope.isLoading = false;

	
	    			},function(result) {
	    				console.log("getMultipleDataEnties error", data);
	    				scope.isLoading = false;
	    			});
	    		}).error(function(data){
	    			console.log("getDataEntities error", data);
    				scope.isLoading = false;
	    		});
            }
            else{
            	scope.forcedirectedData ={"nodes":forcedirectedNodesParam, "links": forcedirectedLinksParam};
            }

            var color = d3.scale.category20()

            console.log("attrs", attr);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/forcedirected_chart.html",
    '<div class="yucca-widget yucca-dataset-forcedirected">\n' +
    '    <header class="yucca-dataset-forcedirected-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-forcedirected-content">\n' +
    '        <section class="yucca-dataset-forcedirected-chart">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-forcedirected-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="chartMessage != null" class="yucca-dataset-forcedirected-chart-message" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px">Loading&hellip;</div>\n' +
    '        	<forcedirected-chart ng-if="!isLoading &&  chartMessage == null &&  forcedirectedLinks.length>0" links="forcedirectedLinks" link_length={{linkLength}}  node_size={{nodeSize}} '+
    '                width="{{chartWidth}}" height="{{chartHeight}}" node_icon="{{nodeIcon}}" link_line="{{linkLine}}" compute_statistic="{{computeStatistic}}" node_type_icon="{{nodeTypeIcon}}"></forcedirected-chart>\n' +
    '        </section>\n' +
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);




yuccaWidgetsModule.directive('ngYuccaDatasetImageGallery', ['metadataService','dataService', '$yuccaHelpers', '$interval', 'leafletData', '$compile', '$timeout',
    function (metadataService, dataService,$yuccaHelpers, $interval, leafletData, $compile, $timeout) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/dataset_image_gallery.html',
        link: function(scope, elem, attr) {
            
            var user_token =  attr.userToken;
            scope.debug = attr.debug==="true"?true:false;
            
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'slideshow');
            scope.datasetImageGalleryMapId = "map"+new Date().getTime();

            var filter  = attr.filter;
            var skip  = attr.skip;
            var top  = attr.top;
            if(isNaN(top) || top<1)
            	top  =10;
            else if(top>50)
            	top=50;
            	
            var interval  =attr.interval;
            if(isNaN(interval) || interval<500)
            	interval  =2000;
            var imageColumns = scope.$eval(attr.imageColumns);
            scope.hasMap = false;
            var positionColumns = null;
            if(typeof attr.positionColumns != undefined && attr.positionColumns!=null){
            	positionColumns =  scope.$eval(attr.positionColumns);
            	scope.hasMap = true;
            }
            
            var imageTitleColumn = attr.imageTitleColumn;

            var markerAsImage = attr.markerAsImage==="true"?true:false;
            var	markerUrl = attr.markerUrl;
            scope.showTitle = attr.showTitle==="false"?false:true;
            
            var	markerColor = attr.markerUrl;
            if(typeof markerColor == 'undefined' || markerColor ==null)
            	markerColor = "#00bbf0";
            

            scope.allData = [];

            scope.currentImageIndex = 0;
            scope.nexImage = function(imageIndex){
            	if(imageIndex!=null && imageIndex<scope.allData.length){
            		scope.currentImageIndex = imageIndex;
                    $interval.cancel(slideshowInterval);
            	}
            	else {
            		if(scope.currentImageIndex>= scope.allData.length-1){
            			scope.currentImageIndex = 0;
            		}
            		else
            			scope.currentImageIndex++;
            	}

            };
            
            var slideshowInterval = $interval(function(){scope.nexImage();}, interval);
            
            
            scope.mapData = {"markers": {},"markerstyles": []};
            var bounds = {};
            bounds[scope.datasetImageGalleryMapId] = [];
            

            var createMarker = function(iconUrl, lat, lng){
            	var marker = {};
				marker.lat = parseFloat(lat);
				marker.lng = parseFloat(lng);
				if(markerAsImage){
					marker.icon = {	 iconUrl: iconUrl,
			                         iconSize:     [48, 48]
						 		  };
				}
				else{
					if(markerUrl!=null && markerUrl!=''){
						marker.icon = {	
							iconUrl: markerUrl,
				 		 };
					}
					else{
						marker.icon = {	
							markerColor: markerColor,
				 		};
					}
				}
				
				
				marker.message = "<img src='" + iconUrl +  "'  class='yucca-dataset-image-gallery-popup-img'> </img>";

				bounds[scope.datasetImageGalleryMapId].push([L.latLng(marker.lat, marker.lng)]);
				return marker;
            };
            
          /*  
            metadataService.getDatasetMetadata(attr.tenantCode, attr.datasetCode).success(
                function(metadata) {
                	console.log("metadata",metadata);
                    scope.metadata = metadata;
                    
                }
            );
            */

            scope.totalCount = "-";
            scope.imgUrl = null;
            scope.debugMessages = [];
        	scope.datasetImageGalleryMaxBounds = {southWest: {lat: 38.700247900602726, lng: -9.165430068969727},northEast: {lat: 38.72703673982525,lng: -9.110498428344725}};

        	dataService.getDataEntities(attr.datasetCode, user_token, filter,  skip, top, 'internalId%20desc').success( function(data) {

            		if(data!=null && data.d!=null){
            			 scope.totalCount = data.d.__count;
            			 var validIdBinaries = [];
            			 var idBinaryPosiytionsMap = [];
            			 var idBinaryLabelMap = [];
            			 
            			 for (var i = 0; i < data.d.results.length; i++) {
            				var d  =data.d.results[i];
            				
							var binariesUrl = d.Binaries.__deferred.uri.replace("http://","https://");
							for(var colsIndex = 0; colsIndex <imageColumns.length; colsIndex++){
								if(d[imageColumns[colsIndex]]!=null){
									validIdBinaries.push(d[imageColumns[colsIndex]].idBinary); 
									idBinaryPosiytionsMap[d[imageColumns[colsIndex]].idBinary] = [d[positionColumns[0]],d[positionColumns[1]]];
									if(typeof imageTitleColumn != 'undefined' &&  imageTitleColumn !=null)
										idBinaryLabelMap[d[imageColumns[colsIndex]].idBinary] = d[imageTitleColumn];
								}
							}
							for(var colsIndex = 0; colsIndex <imageColumns.length; colsIndex++){
								if(d[imageColumns[colsIndex]]!=null){
									dataService.getBinariesData(binariesUrl).success( function(binariesData) {
										console.log("idBinary, binariesData",binariesData);
										for(var j = 0; j < binariesData.d.results.length;j++){
											//if(binariesData.d.results[j].idBinary == idBinary){
											var idBinary = binariesData.d.results[j].idBinary;
											if(validIdBinaries.indexOf(idBinary) > -1){
												var urlDownloadBinary  = binariesData.d.results[j].urlDownloadBinary;
												var labelBinary  = binariesData.d.results[j].aliasNameBinary;
												console.log("urlDownloadBinary",urlDownloadBinary);
												var data = {};
												data["url"] = Constants.API_DATA_URL + urlDownloadBinary.substring(5);
												data["label"] = labelBinary;
												if(typeof idBinaryLabelMap[idBinary] !='undefined' && idBinaryLabelMap[idBinary]!=null  && idBinaryLabelMap[idBinary]!= '')
													data["label"] = idBinaryLabelMap[idBinary];
												scope.allData.push(data);
												
												if(scope.hasMap && idBinaryPosiytionsMap[idBinary]!=null ){ 
													scope.mapData.markers[idBinary.replace('.', '_')] = createMarker('http:'+data["url"], idBinaryPosiytionsMap[idBinary][0], idBinaryPosiytionsMap[idBinary][1]);
												}
												
												console.log(scope.mapData.markers);

												
											};
										};
										
										//leafletData.getMap(scope.mapId).then(function (map) {
										//	console.info("map", map);
										//	console.log("bounds",bounds);
											 //map.invalidateSize();
						                //     map.fitBounds(bounds);
						                //});

									});
								}
								else{
									scope.debugMessages.push("Invalid column name: " + imageColumns[colsIndex]);
								}
							}
						};
            		}
            		else{
						scope.debugMessages.push("No data found with dataset code " +attr.datasetCode);
            		};
	        	}
	        );


        	scope.viewMap = function(){
        		scope.panel = 'map';
        		
        		$timeout(function(){
            		var mapTemplate = '<leaflet width="100%" height="300px" markers="mapData.markers" maxbounds="datasetImageGalleryMaxBounds"></leaflet>';
            		angular.element(document.getElementById(scope.datasetImageGalleryMapId)).empty().append($compile(mapTemplate)(scope));
        			var bb = new L.latLngBounds(bounds[scope.datasetImageGalleryMapId]);
            		scope.datasetImageGalleryMaxBounds = {southWest: bb.getSouthWest(), northEast: bb.getNorthEast()};
            		console.info("scope.datasetImageGalleryMaxBounds",scope.datasetImageGalleryMaxBounds);
        		}, 100);
        		
        	};
           
            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_image_gallery.html",
    '<div class="yucca-widget yucca-dataset-image-gallery">\n' +
    '    <header class="yucca-dataset-image-gallery-header">\n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-image-gallery-content">\n' +
    '        <section class="yucca-dataset-image-gallery-map" ng-show="panel==\'map\'">\n' +
    //'           <leaflet width="100%" height="300px" markers="mapData.markers" maxbounds="datasetImageGalleryMaxBounds"></leaflet>\n' +
    '             <div ng-attr-id="{{datasetImageGalleryMapId}}"></div>\n'+
    '        </section>\n' +
    '        <section class="yucca-dataset-image-gallery-slideshow" ng-show="panel==\'slideshow\'" >\n' +
    '        	<div>\n' +
    '              <img ng-src="{{data.url}}" ng-repeat="data in allData track by $index" ng-show="$index==currentImageIndex"/>\n' +
    '              <div class="yucca-dataset-image-gallery-slide-title" ng-show="showTitle">{{allData[currentImageIndex].label}}</div>\n' +
    '              <div class="yucca-dataset-image-gallery-bullets-panel">\n' +
    '                  <a ng-repeat="image in allData track by $index" href ng-click="nexImage($index)" class="yucca-dataset-image-gallery-bullet" ng-class="{active: $index == currentImageIndex}"></a>\n' +
    '        	   </div>\n' +
    '        	</div>\n' +
    '        </section>\n' +
    '        <section class="yucca-widget-debug" ng-show="debug && debugMessages.length>0">\n' +
    '          	<ul><li ng-repeat="m in debugMessages track by $index">{{m}}</li></ul>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-image-gallery-data" ng-hide="allData!=null">\n' +
    '           No data\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-image-gallery-total-count">\n' +
    '            Total: {{totalCount}}\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-image-gallery-toolbar" ng-show="hasMap">\n' +
    '            <a href ng-click="viewMap()"  ng-class="{active: panel == \'map\'}">Map</a> | <a href ng-click="panel=\'slideshow\'"  ng-class="{active: panel == \'slideshow\'}">Slideshow</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetMultidataStats', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/dataset_multidata_stats.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            
            var firstGroupColumn =  $yuccaHelpers.attrs.safe(attr.firstGroupColumn, null);
            var firstGroupColors =  scope.$eval(attr.firstGroupColors);
            if(typeof firstGroupColors == 'undefined' || firstGroupColors == null ||firstGroupColors.length==0){
            	firstGroupColors = Constants.LINE_CHART_COLORS;
            }

            var secondGroupColumn =  scope.$eval(attr.secondGroupColumn);
            console.log("secondGroupColumn",secondGroupColumn);
            var secondGroupLabel =  scope.$eval(attr.secondGroupLabel);
            var thirdGroupColumn = $yuccaHelpers.attrs.safe(attr.thirdGroupColumn, null);


            
            var countingMode  = attr.countingMode;
            
            var histogramGroupColumn =  $yuccaHelpers.attrs.safe(attr.histogramGroupColumn, null);
            var histogramGroupValueColumn = $yuccaHelpers.attrs.safe(attr.histogramGroupValueColumn, null);
            
            if(typeof secondGroupColumn == 'undefined' && histogramGroupColumn==null){
            	secondGroupColumn = [firstGroupColumn];
            	countingMode = 'count';
            }
            else if(histogramGroupColumn!=null)
            	secondGroupColumn = [];
            
            var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, 400);
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'multiBarChart');
            var groupingWay =  $yuccaHelpers.attrs.safe(attr.groupingWay, 'grouped');
            var stacked = false;
            if(groupingWay == 'stacked')
            	stacked = true;
            
            
            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);
            

        	var toolTipContentFunction = function(key, x, y, e, graph) {
        		var dataIndex  = key.index;
        			
        			var tooltip="";
					tooltip += "  <h3 class='yucca-dataset-multidata-stats-tooltip-header'>" + key.value + "</h3>";
					tooltip += "<div class='yucca-dataset-multidata-stats-tooltip'>";
					tooltip += "  <table><tbody>";
					for (var i = 0; i < scope.chartData.length; i++) {
						var firstSerie = scope.chartData[i];
						for (var j = 0; j < firstSerie.values.length; j++) {
							var secondSerie = firstSerie.values[j];
							if(secondSerie.label == key.value){
								var style  = "";
								if(firstSerie.key == key.data.key)
									style = "font-weight:  bold; color: " +firstSerie.color+ ";";
								tooltip += "  <tr style='"+style+"'>";
								tooltip += "      <td><span class='yucca-dataset-multidata-stats-tooltip-label'>"+secondSerie.key+"</span></td>";
								tooltip += "      <td><span class='yucca-dataset-multidata-stats-tooltip-value'>"+secondSerie.value+"</span></td>";
								tooltip += "  </tr>";
							}
						}
					}
					tooltip += "  </tbody></table>";
					tooltip += "</div>";	
        			
        	    	return  tooltip;
        		};
        	
        	scope.options = {
    			chart: {
    				type: chartType,
    	            height: parseInt(chartHeight),
    	            margin : {
	                    top: 24,
	                    right: 24,
	                    bottom: 24,
	                    left: 64
    	            },
    	            x: function(d){return d.label;},
    	            y: function(d){return d.value;},
    	            showValues: true,
	                valueFormat: function(d){
	                    return parseInt(d);;
	                },
	                duration: 500,
	                "stacked": stacked,
	                xAxis: {
	                    showMaxMin: false
	                },
	                yAxis: {
	                    axisLabelDistance: -10
	                },
	                tooltip:{
	                	contentGenerator: toolTipContentFunction
	                }
	            }
	        };
        	
        	
        	var allTableData = [];
        	scope.changeTableData = function(index, mainPanel){
        		console.log("index", index, mainPanel);
        		if(mainPanel && thirdGroupColumn!=null)
        			scope.tableData = allTableData[index];
        	};
        	
        	
        	var groupData = function(allData){
        		var dataGroup  = {};
    			var valueIndexs = {};
    			var colorIndex = 0;
    			
    			var detailsTableData  = {};
    			var mainTableData = {};
				if(histogramGroupColumn!=null){
					for(var i=0; i<allData.length; i++){
	        			var d=  allData[i];
    					if(secondGroupColumn.indexOf(d[histogramGroupColumn])<0)
    						secondGroupColumn.push(d[histogramGroupColumn]);
					}
        		}

        		for(var i=0; i<allData.length; i++){
        			var d=  allData[i];
        			if(typeof dataGroup[d[firstGroupColumn]] == 'undefined'){
        				var v = [];
        				mainTableData[d[firstGroupColumn]]= [d[firstGroupColumn]];
        				for(var j=0; j<secondGroupColumn.length; j++){
        					valueIndexs[d[firstGroupColumn] + "_" + secondGroupColumn[j]] = j;
        					var label  = secondGroupColumn[j];
        					if(typeof secondGroupLabel != 'undefined' && secondGroupLabel!=null && secondGroupLabel.length>j)
        						label = secondGroupLabel[j];
        					v[j] = {"label":label,"value": 0};
        					
        					
        					mainTableData[d[firstGroupColumn]].push(0);
        					detailsTableData[d[firstGroupColumn]] = {};
        				}

        				dataGroup[d[firstGroupColumn]] = [{key: d[firstGroupColumn], values: v}];
        				if(typeof firstGroupColors != 'undefined' && firstGroupColors != null && colorIndex<firstGroupColors.length){
        					dataGroup[d[firstGroupColumn]][0].color= firstGroupColors[colorIndex];
        					colorIndex++;
        				}
        				
        				
        			}
        			
    				for(var j=0; j<secondGroupColumn.length; j++){
    					var add  = 1;
    					if(histogramGroupColumn!=null){
    						if(secondGroupColumn[j] == d[histogramGroupColumn]){
    	    					if(countingMode == 'sum'  && histogramGroupValueColumn !=null)
    	    						add  = parseInt(d[histogramGroupValueColumn]);
    						}
    						else
    							add = 0;
    					}
    					else{
	    					if(countingMode == 'sum' )
	    						add  = parseInt(d[secondGroupColumn[j]]);
    					}
    					
    					dataGroup[d[firstGroupColumn]][0].values[valueIndexs[d[firstGroupColumn]+ "_" + secondGroupColumn[j]]].value += add;
    					mainTableData[d[firstGroupColumn]][j+1] += add;
    					
    					if(thirdGroupColumn!=null){
    						var thirdColumnValue = d[thirdGroupColumn];
	    					if(typeof detailsTableData[d[firstGroupColumn]][thirdColumnValue] == 'undefined'){
	    						detailsTableData[d[firstGroupColumn]][thirdColumnValue] = new Array(secondGroupColumn.length);
	    						detailsTableData[d[firstGroupColumn]][thirdColumnValue][0] = thirdColumnValue;
	    						for(var k=0; k<secondGroupColumn.length; k++)
	    							detailsTableData[d[firstGroupColumn]][thirdColumnValue][k+1] = 0;
	    					}
	 
	    					detailsTableData[d[firstGroupColumn]][thirdColumnValue][j+1]  += add;
    					}
    				}
        			
        		}
        		console.log("secondGroupColumn", secondGroupColumn);
        		console.log("dataGroup",dataGroup);
        		console.log("valueIndexs",valueIndexs);
        		
        		
        		for ( var dataKey in dataGroup) {
        			scope.chartData.push(dataGroup[dataKey][0]);
				}
        		allTableData.push({title:'', mainPanel: true, data: mainTableData});//mainTableData;
        		for ( var detailTableIndex in detailsTableData) {
        			allTableData.push({title:detailTableIndex, mainPanel: false, data: detailsTableData[detailTableIndex]});
				}
        		scope.tableData = allTableData[0];
        		console.log("scope.chartData",scope.chartData);
        		console.log("allTableData  f", allTableData);
        		console.log("detailsTableData  f", detailsTableData);
        	};
            
        	
			scope.tableData = [];
			scope.tableDataColums = [];
				for(var j=0; j<secondGroupColumn.length; j++){
	
				var label  = secondGroupColumn[j];
				if(typeof secondGroupLabel != 'undefined' && secondGroupLabel!=null && secondGroupLabel.length>j)
					label = secondGroupLabel[j];
				scope.tableDataColums.push(label);
			}
            scope.chartData = [];
    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
    			console.log("firstData", firstData);
    			
    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,   'internalId%20desc', firstData.d.__count).then( function(data) {
    				var allData = [];
    				console.log("data", data);
    				for(var i=0; i<data.length; i++){
    					allData = allData.concat(data[i].data.d.results);
    				}
    				console.log("allData", allData);
    				
    				groupData(allData); 
    				console.log("----",scope.allChartData);
    				

    			});
    		});

            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_multidata_stats.html",
    '<div class="yucca-widget yucca-dataset-multidata-stats">\n' +
    '    <header class="yucca-dataset-multidata-stats-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-multidata-stats-content">\n' +
    '        <section class="yucca-dataset-multidata-stats-chart" ng-show="panel==\'chart\'">\n' +
    '        	<nvd3 options="options" data="chartData"></nvd3>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-multidata-stats-data"  ng-show="panel==\'data\'">\n' +
    '           <table class="yucca-dataset-multidata-stats-table">\n'+
    '               <thead >\n' +
    '                  <tr>\n'+
    '                      <th><a href ng-click="changeTableData(0, true)" ng-hide="tableData.mainPanel"><span  class="back">&laquo; Back</span> </a> {{tableData.title}}</th>\n' +
    '                      <th ng-repeat="title in tableDataColums track by $index">{{title}}</th>\n'+
    '                  </tr>\n' +
    '               </thead>\n' +
    '               <tbody>\n' +
    '                   <tr ng-repeat="row in tableData.data track by $index" ng-click="changeTableData(($index+1), tableData.mainPanel)" ng-class="{selectable: tableData.mainPanel}">\n' +
    '                     <td ng-repeat="data in row track by $index">\n'+
    '                         <span class="yucca-dataset-multidata-stats-value">{{data}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-multidata-stats-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Chart</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetMultidataTreemap', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'AE',
        scope: {},
        templateUrl:'template/dataset_multidata_treemap.html',
        link: function(scope, elem, attr) {
        	
        	scope.treemapData = null;
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, "Treemap");
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            var chartTitle = $yuccaHelpers.attrs.safe(attr.chartTitle, attr.datasetCode);
            

            
            var secondGroupColumn =  $yuccaHelpers.attrs.safe(attr.secondGroupColumn, null);
            var colors =  scope.$eval(attr.colors);
            if(typeof colors == 'undefined' || colors == null ||colors.length==0){
            	colors = Constants.LINE_CHART_COLORS;
            }

            var firstGroupColumn =  scope.$eval(attr.firstGroupColumn);
            console.log("secondGroupColumn",secondGroupColumn);
            var firstGroupLabel =  scope.$eval(attr.firstGroupLabel);
            var thirdGroupColumn = $yuccaHelpers.attrs.safe(attr.thirdGroupColumn, null);
            var fourthGroupColumn =  $yuccaHelpers.attrs.safe(attr.fourthGroupColumn, null);

            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            scope.decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };

            
            var countingMode  = attr.countingMode;

            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, 500);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, 400);
            
            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);

        	
        	var allTableData = [];
        	scope.changeTableData = function(index, mainPanel){
        		console.log("index", index, mainPanel);
        		if(mainPanel && thirdGroupColumn!=null)
        			scope.tableData = allTableData[index];
        	};
        	
           	scope.treemapData  = {"name": chartTitle,"children": []};
           	var groupData = function(allData){
           		var mainTableData = {};
           		var detailsTableData  = {};
           		var childrens = [];
				for(var j=0; j<firstGroupColumn.length; j++){
					childrens[firstGroupColumn[j]] = [];
				}
				
           		var add = 1;
           		for(var i=0; i<allData.length; i++){
        			var d=  allData[i];
        			// treemap data
					if(typeof childrens[firstGroupColumn[0]][d[secondGroupColumn]] == 'undefined'){
						for(var j=0; j<firstGroupColumn.length; j++){
							childrens[firstGroupColumn[j]][d[secondGroupColumn]] = [];
						}
        			}

					// table data
					if(typeof mainTableData[d[secondGroupColumn]] == 'undefined'){
						mainTableData[d[secondGroupColumn]]= [d[secondGroupColumn]];
		           		detailsTableData[d[secondGroupColumn]] = {};

					}

					for(var j=0; j<firstGroupColumn.length; j++){
						var fourthElement = fourthGroupColumn ? d[fourthGroupColumn]:0;
						if(thirdGroupColumn!=null && typeof childrens[firstGroupColumn[j]][d[secondGroupColumn]][d[thirdGroupColumn]] == 'undefined')
							childrens[firstGroupColumn[j]][d[secondGroupColumn]][d[thirdGroupColumn]] = {"value":0, "fourthElement":fourthElement};
						
	
						if(countingMode == 'sum' )
							add  = parseFloat(d[firstGroupColumn[j]]);
						
						childrens[firstGroupColumn[j]][d[secondGroupColumn]][d[thirdGroupColumn]].value += add;
						
						if(mainTableData[d[secondGroupColumn]].length==j+1){
							mainTableData[d[secondGroupColumn]].push(0);
						}
						
    					mainTableData[d[secondGroupColumn]][j+1] += add;
    					var thirdColumnValue = d[thirdGroupColumn];
    					if(typeof detailsTableData[d[secondGroupColumn]][thirdColumnValue] == 'undefined'){
    						detailsTableData[d[secondGroupColumn]][thirdColumnValue] = new Array(firstGroupColumn.length);
    						detailsTableData[d[secondGroupColumn]][thirdColumnValue][0] = thirdColumnValue;
    						for(var k=0; k<firstGroupColumn.length; k++)
    							detailsTableData[d[secondGroupColumn]][thirdColumnValue][k+1] = 0;
    					}
 
    					detailsTableData[d[secondGroupColumn]][thirdColumnValue][j+1]  += add;
					}				
					
           		}
           		console.log("mainTableData new", mainTableData);
           		console.log("detailsTableData new", detailsTableData);
           		
        		allTableData.push({title:'', mainPanel: true, data: mainTableData});//mainTableData;
        		for ( var detailTableIndex in detailsTableData) {
        			allTableData.push({title:detailTableIndex, mainPanel: false, data: detailsTableData[detailTableIndex]});
				}
        		scope.tableData = allTableData[0];

           		scope.treemapData  = {"name": chartTitle,"children": []};
           		
           		var firstCounter = 0;
           		for ( var first in childrens) {
           			if (childrens.hasOwnProperty(first)) {	           			
           				var name = first;
           				if(typeof firstGroupLabel != 'undefined' && firstGroupLabel!=null && typeof firstGroupLabel[firstCounter] != 'undefined' && firstGroupLabel[firstCounter] !=null){
	           				name = firstGroupLabel[firstCounter];
	           			}
	           			firstCounter++;
	           			var firstChildrens  = {"name": name,"children": [], "color": colors[firstCounter]};
	           			
	           			for ( var second in childrens[first]) {
	           				if (childrens[first].hasOwnProperty(second)) {
		               			var secondChildrens  = {"name": second,"children": []};
		               			for ( var third in childrens[first][second]) {
		               				if (childrens[first][second].hasOwnProperty(third)) {
		               					secondChildrens["children"].push({"name": third,"value":  childrens[first][second][third].value, "fourthElement":{"label":fourthGroupColumn, "value":childrens[first][second][third].fourthElement}});
		               				}
								}
		               			firstChildrens["children"].push(secondChildrens);
	           				}
	           			}           
	           			scope.treemapData["children"].push(firstChildrens);
           			}
				}
           		console.log("scope.treemapData",scope.treemapData);
           	};

           	

        	
            
        	
			scope.tableData = [];
			scope.tableDataColums = [];
				for(var j=0; j<firstGroupColumn.length; j++){
	
				var label  = firstGroupColumn[j];
				if(typeof firstGroupLabel != 'undefined' && firstGroupLabel!=null && firstGroupLabel.length>j)
					label = firstGroupLabel[j];
				scope.tableDataColums.push(label);
			}
			scope.isLoading = true;
			scope.chartMessage = null;
    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
    			console.log("firstData", firstData);
    			
    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,   'internalId%20desc', firstData.d.__count).then( function(data) {
    				scope.isLoading = false;
    				scope.chartMessage = null;
    				if(typeof data == 'undefined' || data == null || data.length ==0){
    					scope.chartMessage = "No data found";
    				}
    				else{
	    				var allData = [];
	    				console.log("data", data);
	    				for(var i=0; i<data.length; i++){
	    					allData = allData.concat(data[i].data.d.results);
	    				}
	    				console.log("allData", allData);
	    				
	    				groupData(allData); 
	    				console.log("----",scope.allChartData);
    				}

    			}, function(){
    				scope.isLoading = false;
    				scope.chartMessage = "An error occurred. Please try again later.";
    			});
    		});

            console.log("attrs", attr);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_multidata_treemap.html",
    '<div class="yucca-widget yucca-dataset-multidata-treemap">\n' +
    '    <header class="yucca-dataset-multidata-treemap-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-multidata-treemap-content">\n' +
    '        <section class="yucca-dataset-multidata-treemap-chart" ng-show="panel==\'chart\'">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-multidata-treemap-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="chartMessage != null" class="yucca-dataset-multidata-treemap-chart-message" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px">Loading&hellip;</div>\n' +
    '        	<treemap-chart ng-show="!isLoading &&  chartMessage == null "data="treemapData" width="{{chartWidth}}" height="{{chartHeight}}"></treemap-chart>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-multidata-treemap-data"  ng-show="panel==\'data\'">\n' +
    '           <table class="yucca-dataset-multidata-treemap-table">\n'+
    '               <thead >\n' +
    '                  <tr>\n'+
    '                      <th><a href ng-click="changeTableData(0, true)" ng-hide="tableData.mainPanel"><span  class="back">&laquo; Back</span> </a> {{tableData.title}}</th>\n' +
    '                      <th ng-repeat="title in tableDataColums track by $index">{{title}}</th>\n'+
    '                  </tr>\n' +
    '               </thead>\n' +
    '               <tbody>\n' +
    '                   <tr ng-repeat="row in tableData.data track by $index" ng-click="changeTableData(($index+1), tableData.mainPanel)" ng-class="{selectable: tableData.mainPanel}">\n' +
    '                     <td ng-repeat="data in row track by $index">\n'+
    '                         <span class="yucca-dataset-multidata-treemap-value">{{data|safeNumber:decimalValue:isEuroValue()}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-multidata-treemap-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Chart</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetPopulationPyramid', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/dataset_population_pyramid.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            
            var genderColumn =  $yuccaHelpers.attrs.safe(attr.genderColumn, null);
            var genderLabels = scope.$eval(attr.genderLabels);
            if(typeof genderLabels == 'undefined' || genderLabels == null ||genderLabels.length==0){
            	genderLabels = ["F", "M"];
            }

            var genderValues = scope.$eval(attr.genderValues);
            if(typeof genderValues == 'undefined' || genderValues == null ||genderValues.length==0){
            	genderValues = ["F", "M"];
            }
            
            var genderColors = scope.$eval(attr.genderColors);
            if(typeof genderColors == 'undefined' || genderColors == null ||genderColors.length!=2){
            	genderColors = ["#f8a0df", "#19aeff"];
            }

            var ageColumn =  $yuccaHelpers.attrs.safe(attr.ageColumn,null);
            var ageValues =  $yuccaHelpers.attrs.safe(attr.ageValues,null);
            var ageValues = scope.$eval(attr.ageValues);
            if(typeof ageValues == 'undefined' || ageValues == null ||ageValues.length==0){
            	ageValues == null;
            }
            var ageLabels = scope.$eval(attr.ageLabels);
            if(typeof ageLabels == 'undefined' || ageLabels == null ||ageLabels.length==0){
            	ageLabels = null;
            }
            
            

            var valueColumn =  $yuccaHelpers.attrs.safe(attr.valueColumn,null);
            
            var countingMode  = $yuccaHelpers.attrs.safe(attr.countingMode, "count");

            var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, 400);
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'multiBarHorizontalChart');
            var groupingWay =  $yuccaHelpers.attrs.safe(attr.groupingWay, 'stacked');
            var stacked = false;
            if(groupingWay == 'stacked')
            	stacked = true;
            
            
            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);
            

        	var toolTipContentFunction = function(key, x, y, e, graph) {
        		var dataIndex  = key.index;
        			
        			var tooltip="";
					tooltip += "  <h3 class='yucca-dataset-population-pyramid-tooltip-header'>" + key.value + "</h3>";
					tooltip += "<div class='yucca-dataset-population-pyramid-tooltip'>";
					tooltip += "  <table><tbody>";
					for (var i = 0; i < scope.chartData.length; i++) {
						var firstSerie = scope.chartData[i];
						for (var j = 0; j < firstSerie.values.length; j++) {
							var secondSerie = firstSerie.values[j];
							if(secondSerie.label == key.value){
								var style  = "";
								if(firstSerie.key == key.data.key)
									style = "font-weight:  bold; color: " +firstSerie.color+ ";";
								tooltip += "  <tr style='"+style+"'>";
								tooltip += "      <td><span class='yucca-dataset-population-pyramid-tooltip-label'>"+secondSerie.key+"</span></td>";
								tooltip += "      <td><span class='yucca-dataset-population-pyramid-tooltip-value'>"+secondSerie.valueLabel+"</span></td>";
								tooltip += "  </tr>";
							}
						}
					}
					tooltip += "  </tbody></table>";
					tooltip += "</div>";	
        			
        	    	return  tooltip;
        		};
        	
        	scope.options = {
    			chart: {
    				type: chartType,
    	            height: parseInt(chartHeight),
    	            margin : {
	                    top: 24,
	                    right: 24,
	                    bottom: 24,
	                    left: 64
    	            },
    	            x: function(d){return d.label;},
    	            y: function(d){return d.value;},
    	            showValues: true,
	                valueFormat: function(d){
	                    return parseInt(d);
	                },
	                duration: 500,
	                "stacked": stacked,
	                xAxis: {
	                    showMaxMin: false
	                },
	                yAxis: {
	                    axisLabelDistance: -10,
	                    tickFormat: function (d) { return Math.abs(d) }
	                },
	                tooltip:{
	                	contentGenerator: toolTipContentFunction
	                }
	            }
	        };
        	
        	
        	
        	var allTableData = [];
        	
        	var groupData = function(allData){
        		try{
	        		scope.chartData = [{"key": genderLabels[0], "color":genderColors[0],  "values": []}, {"key": genderLabels[1], "color":genderColors[1],  "values": []}];
	        		scope.tableData = [];
	        		var femaleData = {};
	        		var maleData = {};
        			if(ageValues!=null){
        				for(var i=0; i<ageValues.length;i++){
	        				femaleData[ageValues[i]] = 0;
	        				maleData[ageValues[i]] = 0;
        				}
        					
        			}
	        		for(var i=0; i<allData.length; i++){
	        			var d=  allData[i];
	
	        			if(typeof femaleData[d[ageColumn]] == 'undefined') {
	        				femaleData[d[ageColumn]] = 0;
	        				maleData[d[ageColumn]] = 0;
	        			}
	        			
	        			console.log("d[valueColumn]",d[valueColumn]);
	        			var val = isNaN(d[valueColumn])?0:parseInt(d[valueColumn]);
	        			
	        			if(d[genderColumn]==genderValues[0]){
	        				if(countingMode == "count")
	        					femaleData[d[ageColumn]] --;
	        				else if(countingMode == "sum")
	        					femaleData[d[ageColumn]] -= parseInt(val);
	        			}
	        			else if(d[genderColumn]==genderValues[1]){
	        				if(countingMode == "count")
	        					maleData[d[ageColumn]] ++;
	        				else if(countingMode == "sum")
	        					maleData[d[ageColumn]] += parseInt(val);
	        			}
	        		}
        	
	        		for (var property in femaleData) {
	        		    if (femaleData.hasOwnProperty(property)) {
	        		    	var ageLabel = property;
	        		    	if(ageLabels !=null && typeof ageLabels[property] != "undefined" && ageLabels[property]!=null)
	        		    		ageLabel= ageLabels[property];
	        		    		
	        		    	scope.chartData[0].values.push({"label": ageLabel, "value":femaleData[property], "valueLabel":-1*femaleData[property]});
	        		    	scope.chartData[1].values.push({"label": ageLabel, "value":maleData[property],"valueLabel":maleData[property]});
	        		    	scope.tableData.push([property, -1*femaleData[property], maleData[property]])
	        		    }
	        		}
	        		
	        		console.log("chartData", scope.chartData);
	        		console.log("tableData", scope.tableData);
	        	
        		}
        		catch (e) {
        			console.error("groupData",e);
				}
        		
        		
        	};
        	
			scope.isLoading = true;

    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
    			console.log("firstData", firstData);
    			
    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,   'internalId%20desc', firstData.d.__count).then( function(data) {
    				var allData = [];
    				console.log("data", data);
    				for(var i=0; i<data.length; i++){
    					allData = allData.concat(data[i].data.d.results);
    				}
    				console.log("allData", allData);
    				scope.isLoading = false;
    				groupData(allData); 
    				

    			});
    		});

            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_population_pyramid.html",
    '<div class="yucca-widget yucca-dataset-population-pyramid">\n' +
    '    <header class="yucca-dataset-population-pyramid-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-population-pyramid-content">\n' +
    '        <section class="yucca-dataset-population-pyramid-chart" ng-show="panel==\'chart\'">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-pyramid-data-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '        	<nvd3 options="options" data="chartData" ></nvd3>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-population-pyramid-data"  ng-show="panel==\'data\'">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-pyramid-data-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <table class="yucca-dataset-population-pyramid-table" ng-show="!isLoading" >\n'+
    '               <thead >\n' +
    '                  <tr>\n'+
    '                      <th>{{tableData.title}}</th>\n' +
    '                      <th>F</th>\n'+
    '                      <th>M</th>\n'+
    '                  </tr>\n' +
    '               </thead>\n' +
    '               <tbody>\n' +
    '                   <tr ng-repeat="row in tableData track by $index">\n' +
    '                     <td ng-repeat="data in row track by $index">\n'+
    '                         <span>{{data}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-population-pyramid-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Chart</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetSankeyChart', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'AE',
        scope: {},
        templateUrl:'template/dataset_sankey_chart.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, "Sankey");
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            var chartTitle = $yuccaHelpers.attrs.safe(attr.chartTitle, attr.datasetCode);
            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, elem[0].offsetWidth);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, elem[0].offsetHeight);

            var sankeyNodeColumns = scope.$eval(attr.nodeColumns);
            var sankeyNodeRender = scope.$eval(attr.sankeyNodeRender);
            var baseColor = $yuccaHelpers.attrs.safe(attr.baseColor, null);

        	console.log("sankeyNodeColumns - data",sankeyNodeColumns);
            var sankeyNodesParam = scope.$eval(attr.sankeyNodes);
            var sankeyLinksParam = scope.$eval(attr.sankeyLinks);

            var countingMode  = $yuccaHelpers.attrs.safe(attr.countingMode, "count");
            var valueColumn = $yuccaHelpers.attrs.safe(attr.valueColumn, null);
            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            var decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };

        	scope.sankeyData ={"nodes":[], "links": []};
            
            var compactDataForSankey = function(data){
            	console.debug("compactDataForSankey - data",data);
            	var uniqueNode = {};
            	var sankeyNodes = [];
            	var sankeyMatrix = [];
            	var sankeyLinks = [];
            	var sankeyLinksDictionary = [];
            	var nodeIndex = 0;
            	for(var i=0; i<data.data.length; i++){
            		for(var j=0; j<sankeyNodeColumns.length; j++){
            			if(typeof(sankeyMatrix[sankeyNodeColumns[j]]) == "undefined")
            				sankeyMatrix[sankeyNodeColumns[j]] = [];
	            		if( typeof(uniqueNode[sankeyNodeColumns[j] +"_"+data.data[i][sankeyNodeColumns[j]]]) == "undefined"){
	            			var node = {"name": ""+data.data[i][sankeyNodeColumns[j]], "index": nodeIndex, "label": ""+data.data[i][sankeyNodeColumns[j]], "color": baseColor,"fades":true};
	            			if(typeof sankeyNodeRender!= 'undefined' && typeof sankeyNodeRender[sankeyNodeColumns[j]+"_"+node.name] != 'undefined'){
	            				var render = sankeyNodeRender[sankeyNodeColumns[j]+"_"+node.name];
	            				if(typeof render.label!=undefined)
	            					node.label = render.label;
	            				if(typeof render.color!=undefined)
	            					node.color = render.color;
	            				if(render.fades=="true")
	            					node.fades = true;
	            				else
	            					node.fades = false;
	            			}
	            			sankeyNodes.push(node);
	            			sankeyMatrix[sankeyNodeColumns[j]].push({"node":data.data[i][sankeyNodeColumns[j]],"index": nodeIndex});
	            			nodeIndex++;
	            		}
	            		uniqueNode[sankeyNodeColumns[j] +"_"+data.data[i][sankeyNodeColumns[j]]] = 0;
            		}
            	}
            	console.debug("sankeyNodes", sankeyNodes);
            	console.debug("sankeyMatrix", sankeyMatrix);
            	
              	for(var i=0; i<data.data.length; i++){
            		for(var j=0; j<sankeyNodeColumns.length; j++){
            			if(j<sankeyNodeColumns.length-1){
            				var key= sankeyNodeColumns[j];
	            			for(var k=0; k<sankeyMatrix[key].length; k++){
	            				var source = sankeyMatrix[key][k];
	    						for(var m=0; m<sankeyMatrix[sankeyNodeColumns[j+1]].length; m++){
	    							var target = sankeyMatrix[sankeyNodeColumns[j+1]][m];
	    							if(typeof(sankeyLinksDictionary[key+"|"+source.node+"|"+target.node]) == "undefined")
	    	            				sankeyLinksDictionary[key+"|"+source.node+"|"+target.node] = {"source": source.index, "target":target.index, "value": 0};
	    							if(data.data[i][sankeyNodeColumns[j]] == source.node && data.data[i][sankeyNodeColumns[j+1]]  == target.node){
	    								var add = countingMode=='sum'?parseFloat(data.data[i][valueColumn]):1;
	    								sankeyLinksDictionary[key+"|"+source.node+"|"+target.node].value += add;
	    							}
	    						}
	            			}
            						
            			}
            					
            		}
            				
            	}
              	
              	

       		
            	
            	console.debug("sankeyLinksDictionary", sankeyLinksDictionary);
                for(var key in sankeyLinksDictionary){
                	if(sankeyLinksDictionary[key].value!=0)
                		sankeyLinks.push(sankeyLinksDictionary[key]);
                }
                
            	scope.sankeyData ={"nodes":sankeyNodes, "links": sankeyLinks};
            	
            	console.debug("sankeyData", scope.sankeyData);

            };
            if(typeof sankeyNodesParam == 'undefined' || sankeyNodesParam == null || sankeyNodesParam =="" ||
            	typeof sankeyLinksParam == 'undefined' || sankeyLinksParam == null || sankeyLinksParam =="" ){
    			scope.isLoading = true;

	    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
	    			var maxData = firstData.d.__count>10000?10000:firstData.d.__count;
	    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,  null /*'internalId%20desc'*/, maxData).then( function(result) {
	    				var data = [];
	    				var total = 0;
	    				for(var i=0; i<result.length; i++){
	    					total = result[i].data.d.__count;
	    					for(var j=0; j<result[i].data.d.results.length; j++){
	    						data.push(result[i].data.d.results[j]);
	    					}
	    				}
	    				compactDataForSankey({"total":total,"data":data});
	    				scope.isLoading = false;

	
	    			},function(result) {
	    				console.log("getMultipleDataEnties error", data);
	    				scope.isLoading = false;
	    			});
	    		}).error(function(data){
	    			console.log("getDataEntities error", data);
    				scope.isLoading = false;
	    		});
            }
            else{
            	scope.sankeyData ={"nodes":sankeyNodesParam, "links": sankeyLinksParam};
            }

            
            console.log("attrs", attr);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_sankey_chart.html",
    '<div class="yucca-widget yucca-dataset-sankey">\n' +
    '    <header class="yucca-dataset-sankey-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-sankey-content">\n' +
    '        <section class="yucca-dataset-sankey-chart">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-sankey-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="chartMessage != null" class="yucca-dataset-sankey-chart-message" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px">Loading&hellip;</div>\n' +
    '        	<sankey-chart ng-show="!isLoading &&  chartMessage == null "data="sankeyData" width="{{chartWidth}}" height="{{chartHeight}}"></sankey-chart>\n' +
    '        </section>\n' +
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaDatasetTreemap', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'AE',
        scope: {},
        templateUrl:'template/dataset_treemap.html',
        link: function(scope, elem, attr) {
        	
        	scope.treemapData = null;
        	
        	scope.debug = attr.debug==="true"?true:false;
        	var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
            var filter  = attr.filter;
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, "Treemap");
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            var chartTitle = $yuccaHelpers.attrs.safe(attr.chartTitle, attr.datasetCode);

            
            var colors = Constants.LINE_CHART_COLORS;


            var firstLevelColumn = $yuccaHelpers.attrs.safe(attr.firstLevelColumn, null);
            var firstLevelRender =  scope.$eval(attr.firstLevelRender);
            var secondLevelColumn =  $yuccaHelpers.attrs.safe(attr.secondLevelColumn, null);
            var secondLevelRender =  scope.$eval(attr.secondLevelRender);
            var thirdLevelColumn =  $yuccaHelpers.attrs.safe(attr.thirdLevelColumn, null);
            var thirdLevelRender =  scope.$eval(attr.thirdLevelRender);
            var valueColumn = $yuccaHelpers.attrs.safe(attr.valueColumn, null);
            var euroValue = $yuccaHelpers.attrs.safe(attr.euroValue, false);
            scope.decimalValue = $yuccaHelpers.attrs.safe(attr.decimalValue, 2);
            scope.isEuroValue = function(){
            	return euroValue == "true";
            };
            
            console.debug("firstLevelColumn", firstLevelColumn);
            console.debug("firstLevelRender",firstLevelRender);
            console.debug("secondLevelColumn", secondLevelColumn);
            console.debug("secondLevelRender",secondLevelRender);
            console.debug("thirdLevelColumn", thirdLevelColumn);
            console.debug("thirdLevelRender",thirdLevelRender);
            console.debug("valueColumn",valueColumn);
            
            var countingMode  = $yuccaHelpers.attrs.safe(attr.countingMode, "count");

            scope.chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, 100, null, elem[0].offsetWidth);
            scope.chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, elem[0].offsetHeight);
            
            var top = $yuccaHelpers.attrs.num(attr.top, 1, 1000, 1000);
            var skip  = $yuccaHelpers.attrs.num(attr.top, null, null, 1);

        	
        	var allTableData = [];
        	
        	scope.backTableData = function(row){
        		row.level --;
        		scope.changeTableData(row);
        	};
        	
        	scope.changeTableData = function(row){
        		scope.tableData.data = [];
        		scope.tableData.current = row;
        		if(row.level==0){
        			scope.tableData.level = 0;
        			scope.tableData.title = chartTitle;
               		for ( var first in tmpChildrens) {
               			if (tmpChildrens.hasOwnProperty(first)) {	   
               				scope.tableData.data.push({"level":1, "first": first, "name":tmpChildrens[first].name, "value":tmpChildrens[first].value});
               			}
               		}
        		}
        		else if(row.level==1){
        			scope.tableData.level = 1;
        			scope.tableData.title = tmpChildrens[row.first].name;
               		for ( var second in tmpChildrens[row.first].children) {
               			if (tmpChildrens[row.first].children.hasOwnProperty(second)) {	   
               				scope.tableData.data.push({"level":2, "first": row.first, "second":second,  "name":tmpChildrens[row.first].children[second].name, "value":tmpChildrens[row.first].children[second].value});
               			}
               		}
        		}
        		else if(row.level==2){
        			scope.tableData.level = 2;
        			scope.tableData.title = tmpChildrens[row.first].children[row.second].name;
               		for ( var third in tmpChildrens[row.first].children[row.second].children) {
               			if (tmpChildrens[row.first].children[row.second].children.hasOwnProperty(third)) {	   
               				scope.tableData.data.push({"level":2, "first": row.first, "second": row.second,  "name":tmpChildrens[row.first].children[row.second].children[third].name, "value":tmpChildrens[row.first].children[row.second].children[third].value});
               			}
               		}
        		}
        		
        	};
        	
           	scope.treemapData  = {"name": chartTitle,"children": []};

           	var colorIndex = 0;
           	
           	var initLevel = function(d, column, render, addColor){
           		var level = {'name':d[column], "value": 0, "children":{}};
           		if(addColor){
	           			level.color = colors[colorIndex];
						colorIndex++;
						if(colorIndex== colors.length)
							colorIndex = 0;
				} 
				if(render!=null && typeof render[d[column]] != 'undefined'){
					if(typeof render[d[column]].label!= 'undefined')
						level.name = render[d[column]].label;
					if(addColor && typeof render[d[firstLevelColumn]].color!= 'undefined')
							level.color = render[d[column]].color;
				
				}
				return level;
           	};
       		var tmpChildrens  = {};

           	var groupData = function(allData){
           		var mainTableData = {};
           		var detailsTableData  = {};
           		//var childrens = [];
           		
           		var percentValues = {};
           		if(firstLevelColumn!=null){
           			//var firstLevel = {};
           			
           			for(var i=0; i<allData.length; i++){
           				var d=  allData[i];
           				// first level
           				if(typeof tmpChildrens[d[firstLevelColumn]] == 'undefined'){
           					tmpChildrens[d[firstLevelColumn]] = initLevel(d, firstLevelColumn, firstLevelRender, true);
           				}
           				tmpChildrens[d[firstLevelColumn]].value += (countingMode=='sum'?parseFloat(d[valueColumn]):1);
           				
           				// second Level
           				if(typeof tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]] == 'undefined'){
           					tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]]= initLevel(d, secondLevelColumn, secondLevelRender, false);
           				}
           				tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]].value += (countingMode=='sum'?parseFloat(d[valueColumn]):1);

           				// third Level
           				if(typeof tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]].children[d[thirdLevelColumn]] == 'undefined'){
           					tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]].children[d[thirdLevelColumn]]= initLevel(d, thirdLevelColumn, thirdLevelRender, false);
           				}
           				tmpChildrens[d[firstLevelColumn]].children[d[secondLevelColumn]].children[d[thirdLevelColumn]].value += (countingMode=='sum'?parseFloat(d[valueColumn]):1);

           				var percentValueKey = d[firstLevelColumn]+"_"+d[secondLevelColumn];
           				if(typeof percentValues[percentValueKey] == 'undefined'){
       						percentValues[percentValueKey] = {"count":0, "total": 0, "min": null, "max": null, "detail":{}};
       					}
           				if(typeof percentValues[percentValueKey].detail[d[thirdLevelColumn]]=='undefined'){
           					percentValues[percentValueKey].detail[d[thirdLevelColumn]]={"count":0, "total": 0};
           				}
       					percentValues[percentValueKey].count++;
       					percentValues[percentValueKey].detail[d[thirdLevelColumn]].count++;
       					if(countingMode=='sum'){
       						percentValues[percentValueKey].total+=parseFloat(d[valueColumn]);
           					percentValues[percentValueKey].detail[d[thirdLevelColumn]].total+=parseFloat(d[valueColumn]);
       					}
           			}
           			
           			
           			console.log("tmpChildrens", tmpChildrens);
           			console.log("percentValues", percentValues);

           		}
           		
           		for ( var firstPercent in percentValues) {
           			if (percentValues.hasOwnProperty(firstPercent)) {
           				for ( var secondPercent in percentValues[firstPercent].detail) {
           					var perVal = countingMode=='sum'?percentValues[firstPercent].detail[secondPercent].total:percentValues[firstPercent].detail[secondPercent].count;
           					
           					if(percentValues[firstPercent].min == null || perVal<percentValues[firstPercent].min)
           						percentValues[firstPercent].min = perVal;
           					if(percentValues[firstPercent].max == null || perVal>percentValues[firstPercent].max)
           						percentValues[firstPercent].max = perVal;
           				}
           			}
           		}
           		
       			console.log("percentValues", percentValues);


           		
           		scope.treemapData  = {"name": chartTitle,"children": []};
           		for ( var first in tmpChildrens) {
           			if (tmpChildrens.hasOwnProperty(first)) {	      
           				var firstValue = scope.isEuroValue()?$yuccaHelpers.render.formatEuro(tmpChildrens[first].value, scope.decimalValue):tmpChildrens[first].value;
	           			var firstChildrens  = {"name": tmpChildrens[first].name,"children": [], "color": tmpChildrens[first].color, "value": tmpChildrens[first].value, "label": tmpChildrens[first].name + " - " + firstValue};
	           			for ( var second in tmpChildrens[first].children) {
	           				
	           				
	           				if (tmpChildrens[first].children.hasOwnProperty(second)) {
	               				var secondValue = scope.isEuroValue()?$yuccaHelpers.render.formatEuro(tmpChildrens[first].children[second].value, scope.decimalValue):tmpChildrens[first].children[second].value;
		               			var secondChildrens  = {"name": tmpChildrens[first].children[second].name,"children": [], "value":  tmpChildrens[first].children[second].value,"label": tmpChildrens[first].children[second].name + " - " + secondValue};
		               			for ( var third in tmpChildrens[first].children[second].children) {
		               				if (tmpChildrens[first].children[second].children.hasOwnProperty(third)) {
		               					var val =  tmpChildrens[first].children[second].children[third].value;
		               					var min =  percentValues[first+"_"+second].min;
		               					var max =  percentValues[first+"_"+second].max;
		               					var total = countingMode=='sum'?percentValues[first+"_"+second].total:percentValues[first+"_"+second].count;

			               				var thirdValue = scope.isEuroValue()?$yuccaHelpers.render.formatEuro(val, scope.decimalValue):val;

		               					var percent =  100*(val)/(total);
		               					var percentLuminance =  100*(val)/(max);

		               					secondChildrens["children"].push({"name": tmpChildrens[first].children[second].children[third].name,
		               						"value":  tmpChildrens[first].children[second].children[third].value, 
		               						"label": tmpChildrens[first].children[second].children[third].name + " - " + val,
		               						"fourthElement":{"label":tmpChildrens[first].children[second].name +": "+ parseFloat(percent).toFixed(1) + "%", "value":percentLuminance}
		               						});
		               				}
								}
		               			firstChildrens["children"].push(secondChildrens);
	           				}
	           			}           
	           			scope.treemapData["children"].push(firstChildrens);
           			}
				}
           		scope.changeTableData({"level":0});

           		console.log("scope.treemapData",scope.treemapData);
           	};

           	

        	
            
        	
			scope.tableData = [];
			scope.isLoading = true;
			scope.chartMessage = null;
    		dataService.getDataEntities(attr.datasetCode,user_token,filter,  0, 1, null).success(function(firstData){
    			console.log("firstData", firstData);
    			
    			dataService.getMultipleDataEnties(attr.datasetCode, user_token, filter,   'internalId%20desc', firstData.d.__count).then( function(data) {
    				scope.isLoading = false;
    				scope.chartMessage = null;
    				if(typeof data == 'undefined' || data == null || data.length ==0){
    					scope.chartMessage = "No data found";
    				}
    				else{
	    				var allData = [];
	    				console.log("data", data);
	    				for(var i=0; i<data.length; i++){
	    					allData = allData.concat(data[i].data.d.results);
	    				}
	    				console.log("allData", allData);
	    				
	    				groupData(allData); 
	    				console.log("----",scope.allChartData);
    				}

    			}, function(){
    				scope.isLoading = false;
    				scope.chartMessage = "An error occurred. Please try again later.";
    			});
    		});

            console.log("attrs", attr);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/dataset_treemap.html",
    '<div class="yucca-widget yucca-dataset-treemap">\n' +
    '    <header class="yucca-dataset-treemap-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-dataset-treemap-content">\n' +
    '        <section class="yucca-dataset-treemap-chart" ng-show="panel==\'chart\'">\n' +
    '           <div ng-show="isLoading" class="yucca-dataset-treemap-loading" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px" ><p>Loading&hellip;</p>\n' +
    '             <div class="yucca-widget-spinner"> <div class="bullet1"></div><div class="bullet2"></div><div class="bullet3"></div></div>\n' +
    '           </div>\n' +
    '           <div ng-show="chartMessage != null" class="yucca-dataset-treemap-chart-message" style="min-height: {{chartHeight}}px;min-width: {{chartWidth}}px">Loading&hellip;</div>\n' +
    '        	<treemap-chart ng-show="!isLoading &&  chartMessage == null "data="treemapData" show_legend="false" width="{{chartWidth}}" height="{{chartHeight}}"></treemap-chart>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-treemap-data"  ng-show="panel==\'data\'">\n' +
    '           <table class="yucca-dataset-treemap-table">\n'+
    '               <thead >\n' +
    '                  <tr>\n'+
    '                      <th colspan="2"><a href ng-click="backTableData(tableData.current)" ng-hide="tableData.level==0"><span  class="back">&laquo; Back</span> </a> {{tableData.title}}</th>\n' +
    '                  </tr>\n' +
    '               </thead>\n' +
    '               <tbody>\n' +
    '                   <tr ng-repeat="row in tableData.data track by $index" ng-click="changeTableData(row)" class="yucca-dataset-treemap-table-row">\n' +
    '                     <td>{{row.name}}</td><td><span class="yucca-dataset-treemap-value">{{row.value|safeNumber:decimalValue:isEuroValue()}}</span></td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-dataset-treemap-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Chart</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamLastValue', ['metadataService','dataService', '$yuccaHelpers', '$interval', '$window',
    function (metadataService, dataService,$yuccaHelpers,$interval,$window) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_last_value.html',
        link: function(scope, elem, attr) {
        	var windowActive = true;
        	$window.onblur = function() {console.log('>onblur'); windowActive = false;};
        	$window.onfocus  = function() {console.log('>onfocus'); windowActive = true;};

            
        	scope.debug = attr.debug==="true"?true:false;
            var user_token =  attr.userToken;
        	scope.debugMessages = [];
        	scope.showLastUpdate= $yuccaHelpers.attrs.safe(attr.showLastUpdate, false) === "true"?true:false;
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'lineChart');
        	var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, null, null, 60);
        	var chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, null, null, 200);
        	var chartColor = $yuccaHelpers.attrs.safe(attr.chartColor, '#0050ef');
        	console.log("chartColor", chartColor);
        	

        	var labels =  scope.$eval(attr.labels);
            if(typeof labels == 'undefined' || labels == null ||labels.length==0){
            	labels = null;
            }        	

            var activeComponents =  scope.$eval(attr.components );
            if(typeof activeComponents == 'undefined' || activeComponents == null ||activeComponents.length==0){
            	activeComponents = null;
            }

        	var toolTipContentFunction = function(key, x, y, e, graph) {
    			var dataIndex  = key.index;
    			var tooltip="";
    			if(chartType == 'lineChart')
    				tooltip=key.point.tooltip;
    			else
    				tooltip=key.data.tooltip;
    	    	return  tooltip;
    		};
            
        	scope.stream  = {};
        	var components = new Array();
         	scope.lastupdate =  new Date();
         	
         	scope.options = {
    			chart: {
    				type: chartType,
    				width: chartWidth,
    	            height: chartHeight,
    	            interpolate: 'basis',
    	            showXAxis: false,
    	            showYAxis: false,
    	            showLegend: false, 
    	            margin : {
	                    top: 0,
	                    right: 6,
	                    bottom: 25,
	                    left: 6
    	            },
    	            x: function(d){return d.x;},
	                tooltip:{contentGenerator: toolTipContentFunction},
	                duration: 250
	            }
    	    };
         	
         	var createChartElement  = function(xValue, yValue){
    		 //  var tooltipText =  "<h3 class='yucca-stream-tweet-stats-tooltip-header'>";
    		 //  tooltipText += $yuccaHelpers.utils.formatData(xValue.getTime());
    		 //  tooltipText +=  "</h3>";
    		 //  tooltipText +=  "<p>Value :<strong>"+yValue+"</strong></p>";
        		
     		   //var element = {x:parseFloat(xValue.getTime()), y:parseFloat(yValue), "tooltip": "<h3 class='yucca-stream-tweet-stats-tooltip-header'>" + $yuccaHelpers.utils.formatData(xValue.getTime()) +
     			//	   "</h3><p>Value :<strong>"+yValue+"</strong></p>"};
    		   //var element = {x:parseFloat(xValue.getTime()), y:parseFloat(yValue)};
    		   return {x:parseFloat(xValue.getTime()), y:parseFloat(yValue), "tooltip": "<h3 class='yucca-stream-tweet-stats-tooltip-header'>" + $yuccaHelpers.utils.formatData(xValue.getTime()) +
 				   "</h3><p>Value :<strong>"+yValue+"</strong></p>"};;
         	};
         	         	
         	var callbackInvoked = false;
        	
    	    var dataCallback = function(message) {
    	    	callbackInvoked = true;
    	       var messageBody = JSON.parse(message.body);
               var newValues = messageBody.values[0];
               scope.lastupdate = newValues.time;
               for(var j = 0; j<scope.stream.components.length; j++){
            	   var component  = scope.stream.components[j];
            	   for (var componentKey in newValues.components) {
            		    if (newValues.components.hasOwnProperty(componentKey) && componentKey == component.name) {
            		    	//scope.$apply(function(){ 
	            		    	scope.stream.components[j].lastValue = newValues.components[componentKey];
	            		    	scope.stream.components[j].lastUpdate = newValues.time;
	            		    	scope.stream.components[j].chartData[0]["values"].push(createChartElement(new Date(newValues.time), newValues.components[componentKey]));
		            			 if(scope.stream.components[j].chartData[0]["values"].length>50){
		            				 scope.stream.components[j].chartData[0]["values"].shift();
		            			 }

				            	var maxMinValue = findMinMaxValue(scope.stream.components[j].chartData[0]["values"]);
				            	scope.stream.components[j].minXValue = maxMinValue[0];
				            	scope.stream.components[j].maxXValue = maxMinValue[1];
				            	scope.stream.components[j].delta = findDelta(scope.stream.components[j].chartData[0]["values"]);			
            		    //	});
            		    }
            	   }
               }
    	    };
    	    
    	    var findMinMaxValue = function(chartDataElementsArray){
    	    	var min  = null;
    	    	var max = null;
    	    	if(typeof chartDataElementsArray!= 'undefined' && chartDataElementsArray!=null && chartDataElementsArray.length>0){
	    	    	for (var i = 0; i < chartDataElementsArray.length; i++) {
	    	    		if(min == null || min>chartDataElementsArray[i].x)
	    	    			min = chartDataElementsArray[i].x;
	    	    		if(max == null || max<chartDataElementsArray[i].x)
	    	    			max = chartDataElementsArray[i].x;
					}
    	    	}
    	    	return [min, max];
    	    };
    	    var findDelta= function(chartDataElementsArray){
    	    	var delta  = null;
    	    	if(typeof chartDataElementsArray!= 'undefined' && chartDataElementsArray!=null){
    	    		if(chartDataElementsArray.length>1)
    	    			delta = parseFloat(chartDataElementsArray[chartDataElementsArray.length-1].y) - parseFloat(chartDataElementsArray[chartDataElementsArray.length-2].y); 
    	    		else
    	    			delta = 0;
    	    		delta  = delta.toPrecision(2);
    	    	}
    	    	return delta;
    	    };
    	    
    	    
    	    if(typeof attr.tenantCode!=undefined && attr.tenantCode!=null &&
    	    	typeof attr.streamCode!=undefined && attr.streamCode!=null &&
    	    	typeof attr.smartobjectCode!=undefined && attr.smartobjectCode!=null){
				metadataService.getStreamMetadata (attr.tenantCode, attr.streamCode, attr.smartobjectCode, user_token).success(function(metadata){
					scope.stream.name = metadata.name;
					if(activeComponents == null){
						scope.stream.components = metadata.stream.components;
						components = metadata.stream.components;
					}
					else{
						scope.stream.components = [];
						for(var k = 0; k< metadata.stream.components.length; k++){
							for(var m = 0; m< activeComponents.length; m++){
								if(activeComponents[m] == metadata.stream.components[k].name){
									scope.stream.components.push(metadata.stream.components[k]);
									components.push(metadata.stream.components[k]);
									break;
								}
							}
						}
					}
					for(var k = 0; k<scope.stream.components.length; k++){
						scope.stream.components[k].chartData = [{"key":"data","values":[], "color": chartColor}];
		            	if(labels!=null){
		            		try {
		            			scope.stream.components[k].label = labels[k];
							} catch (e) {
								scope.stream.components[k].label = scope.stream.components[k].name;
								console.error("Component's label not valid");
							}
		            	}
		            	else
		            		scope.stream.components[k].label = scope.stream.components[k].name;

					}
					
					if(typeof metadata["dataset"]!='undefined' && metadata["dataset"]!=null && typeof metadata["dataset"].code!='undefined' && metadata["dataset"].code!=null){
						dataService.getMeasures(metadata["dataset"].code,user_token,null,  0, 20, 'time%20desc').success((function(dataCallbackIndex){ 
							return function(data) {
								console.debug("getMeasures" , dataCallbackIndex, data);

								if(data.d.results!=null && data.d.results.length>0){
									data.d.results.reverse();
									for(var j = 0; j<scope.stream.components.length; j++){
					            	   var component  = scope.stream.components[j];
					            	   //var chartDataValues = new Array();
					            	   components[j].chartDataValues =  new Array();
					            	   for(var k=0; k<data.d.results.length; k++){
						            	   if(data.d.results[k][component.name] !=null){
						            		   if(k==0){
						            			   scope.stream.components[j].lastValue = data.d.results[k][component.name];
						            			   scope.stream.components[j].lastUpdate = $yuccaHelpers.utils.mongoDate2string(data.d.results[k]["time"]);
						            		   }
						            	
						            		   components[j].chartDataValues.push(createChartElement($yuccaHelpers.utils.mongoDate2millis(data.d.results[k]["time"]),  data.d.results[k][component.name]));
						            		   //chartDataValues.push(createChartElement($yuccaHelpers.utils.mongoDate2millis(data.d.results[k]["time"]),  data.d.results[k][component.name]));
						            	   }
					            	   }
					            	   //scope.stream.components[j].chartData[0]["values"] = chartDataValues;
					            	   var maxMinValue = findMinMaxValue(components[j].chartDataValues);
					            	   scope.stream.components[j].minXValue = maxMinValue[0];
					            	   scope.stream.components[j].maxXValue = maxMinValue[1];
					            	   scope.stream.components[j].delta = findDelta(components[j].chartDataValues);
					               }
					               dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
					               callbackInvoked = true;
								}
							};
						})(metadata.code));
					}
					//else
						dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
					
					
					
				}).error(function(e){
					console.log("error", e);
					scope.debugMessages.push("Stream not found: " + scope.stream);
					
				});
					
					
        	}
        	else{
        		scope.debugMessages.push("Invalid stream definition: tenantCode: " + attr.tenantCode+ " - streamCode: "+ attr.streamCode + " - smartobjectCode: " + attr.smartobjectCode);
        	}
        	
            console.debug("attrs", attr);
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, null);
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


            $interval(function(){
            	if(callbackInvoked && windowActive){
            		//console.warn("in", windowActive,  (new Date().getTime() - start));
            		callbackInvoked = false;
            		for(var m=0; m<components.length; m++){
	            		if(typeof components[m].chartDataValues != 'undefined'){
	            			scope.stream.components[m].chartData[0]["values"] = components[m].chartDataValues.slice();
	            		}
	            	}
            	}
            }, 1000);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_last_value.html",
    '<div class="yucca-widget yucca-stream-last-value">\n' +
    '    <header class="yucca-stream-last-value-header" ng-show="widgetTitle!=null"> \n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-stream-last-value-content">\n' +
    '        <section class="yucca-stream-last-value-data">\n' +
    '           <div class="yucca-stream-last-value-panel " ng-repeat-start="component in stream.components track by $index"> \n' +
    '               <div class="yucca-stream-last-value-component-name"><span title="Phenomenon: {{component.phenomenon}}">{{component.label}}</span></div>\n' +
    '               <div class="yucca-stream-last-value-component-panel"> \n' +
    '                   <div class="yucca-stream-last-value-component-value" title="Exact value: {{component.lastValue}} - Updated at: {{component.lastUpdate|date:\'dd/MM/yyyy  H:mm\'}}">{{component.lastValue|format_big_number}}</div>\n' + 
    '                   <div class="yucca-stream-last-value-component-value-info"> \n' +
    '                       <div class="yucca-stream-last-value-component-trend" ng-show="component.delta!=null" title="Value trend">\n' +
    '					        <span class="trend-up" ng-show="component.delta>0">&plus;</span>\n'+
    '					        <span class="trend-down" ng-show="component.delta<0"></span>\n' +
    '					        <span class="trend-stable" ng-show="component.delta==0"></span>\n' +
    '					        {{component.delta}}\n'+
    '                       </div>\n' +
    '                       <div class="yucca-stream-last-component-measureunit">{{component.measureunit}}</span> </div>\n' +
    '                   </div>\n' +
    '               </div>\n' +
    '               <div class="yucca-stream-last-value-component-chart" ng-show="component.chartData[0].values.length>1"><nvd3 options="options" data="component.chartData"></nvd3></div>\n' +
    '               <div class="yucca-stream-last-value-component-chart-x-xAxis" ng-show="component.chartData[0].values.length>1">\n'+
    '                   <div class="min-value"><span class="value-hour">{{component.minXValue|date:"H:mm"}}</span><span class="value-date">{{component.minXValue|date:"dd MMM yyyy"}}</span></div>\n'+
    '                   <div class="max-value"><span class="value-hour">{{component.maxXValue|date:"H:mm"}}</span><span class="value-date">{{component.maxXValue|date:"dd MMM yyyy"}}</span></div>\n'+
    '               </div>\n' +
    '           </div>\n' +
    '           <div class="yucca-stream-last-value-panel-separator " ng-repeat-end ng-hide="$index<stream.components.length"></div>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-last-value-lastupdate-bar" ng-show="showLastUpdate">\n' +
    '            Updated at: {{lastupdate|date:"dd/MM/yyyy  H:mm"}}\n' + 
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank" title="Powered by smartdatanet.it">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamMonitor', ['metadataService','dataService', '$yuccaHelpers', '$interval', '$window',
    function (metadataService, dataService,$yuccaHelpers,$interval,  $window) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_monitor.html',
        link: function(scope, elem, attr) {
        	

        	
        	var windowActive = true;
        	$window.onblur = function() {console.log('>onblur'); windowActive = false;};
        	$window.onfocus  = function() {console.log('>onfocus'); windowActive = true;};
        	
            var filter  = attr.filter;

        	
        	scope.debug = attr.debug==="true"?true:false;
            var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');
        	scope.debugMessages = [];
        	scope.showLastUpdate= $yuccaHelpers.attrs.safe(attr.showLastUpdate, false) === "true"?true:false;
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'lineChart');
        	var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, null, null, 300);
        	var chartWidth = $yuccaHelpers.attrs.num(attr.chartWidth, null, null, 400);

        	
        	var chartColors =  scope.$eval(attr.chartColors);
            if(typeof chartColors == 'undefined' || chartColors == null ||chartColors.length==0){
            	chartColors = Constants.LINE_CHART_COLORS;
            }
            
            var labels =  scope.$eval(attr.labels);
            if(typeof labels == 'undefined' || labels == null ||labels.length==0){
            	labels = null;
            }        	

            var labels =  scope.$eval(attr.labels);
            if(typeof labels == 'undefined' || labels == null ||labels.length==0){
            	labels = null;
            }        	

            var activeComponents =  scope.$eval(attr.components);
            if(typeof activeComponents == 'undefined' || activeComponents == null ||activeComponents.length==0){
            	activeComponents = null;
            }        	


        	scope.stream  = {};
         	scope.lastupdate =  new Date();
         	
         	scope.options = {
    			chart: {
    				type: chartType,
    				width: chartWidth,
    	            height: chartHeight,
                    useInteractiveGuideline: true,
    	            margin : {
	                    top: 2,	
	                    right: 2,
	                    bottom: 2,
	                    left: 2
    	            },
    	            x: function(d){return d.x;},
    	            xAxis: {tickFormat:(function (d) { return $yuccaHelpers.utils.formatDateFromMillis(d);})},
	                duration: 250
	            }
    	    };
         	
			scope.stream.tableDataValues = [];
			scope.stream.chartData = [];
			var chartData = new Array();

         	
         	var createChartElement  = function(xValue, yValue){
         	// console.error("createChartElement", measureUnit);
    		//   var tooltipText =  "<h3 class='yucca-stream-tweet-stats-tooltip-header'>";
    		//   tooltipText += $yuccaHelpers.utils.formatData(xValue.getTime());
    		//   tooltipText +=  "</h3>";
    		//   tooltipText +=  "<p>Value :<strong>"+yValue+"</strong> <small>" + measureUnit + "</small></p>";
        		
    		   var element = {x:parseFloat(xValue.getTime()), 
    				   y:parseFloat(yValue)};
    		   return element;
         	};
        	
         	var callbackInvoked = false;

    	    var dataCallback = function(message) {
             	callbackInvoked = true;

               var messageBody = JSON.parse(message.body);
               var newValues = messageBody.values[0];
               scope.lastupdate = newValues.time;
   	    	  // scope.$apply(function(){ 
	               // table data
	               scope.stream.tableDataValues.push([$yuccaHelpers.utils.formatDateFromMillis(new Date(newValues.time))]);
	               // chart data
	               for(var j = 0; j<scope.stream.components.length; j++){
	            	   var component  = scope.stream.components[j];
	            	   for (var componentKey in newValues.components) {

	            		    if (newValues.components.hasOwnProperty(componentKey) && componentKey == component.name) {
	            		    	scope.stream.components[j].lastValue = newValues.components[componentKey];
	            		    	scope.stream.components[j].lastUpdate = newValues.time;
				            	
				            	for(var m=0; m<chartData.length; m++){
				            		if(chartData[m].name == component.name){
				            			chartData[m].values.push(createChartElement(new Date(newValues.time), newValues.components[componentKey]));
				            			 if(chartData[m].values.length>200){
				            				 chartData[m].values.shift();
				            			 }
				            			var maxMinValue = findMinMaxValue(chartData[m].values);
				            			scope.stream.components[j].minXValue = maxMinValue[0];
				            			scope.stream.components[j].maxXValue = maxMinValue[1];
				            			break;
				            		}
				            		
				            	}
				            	scope.stream.tableDataValues[scope.stream.tableDataValues.length-1].push(newValues.components[componentKey]);
	            		    }
	            	   }
	               }
	               if(scope.stream.tableDataValues.length>20)
	            	   scope.stream.tableDataValues.shift();
   	    	   //});
               
    	    };
    	    
    	    var findMinMaxValue = function(chartDataElementsArray){
    	    	var min  = null;
    	    	var max = null;
    	    	if(typeof chartDataElementsArray!= 'undefined' && chartDataElementsArray!=null && chartDataElementsArray.length>0){
	    	    	for (var i = 0; i < chartDataElementsArray.length; i++) {
	    	    		if(min == null || min>chartDataElementsArray[i].x)
	    	    			min = chartDataElementsArray[i].x;
	    	    		if(max == null || max<chartDataElementsArray[i].x)
	    	    			max = chartDataElementsArray[i].x;
					}
    	    	}
    	    	return [min, max];
    	    };

    	    
    	    if(typeof attr.tenantCode!=undefined && attr.tenantCode!=null &&
    	    	typeof attr.streamCode!=undefined && attr.streamCode!=null &&
    	    	typeof attr.smartobjectCode!=undefined && attr.smartobjectCode!=null){
				metadataService.getStreamMetadata (attr.tenantCode, attr.streamCode, attr.smartobjectCode, user_token).success(function(metadata){
					console.log("metadata",metadata);
					scope.stream.name = metadata.name;
					var colorIndex = 0;
					if(activeComponents == null)
						scope.stream.components = metadata.stream.components;
					else{
						scope.stream.components = [];
						for(var k = 0; k< metadata.stream.components.length; k++){
							for(var m = 0; m< activeComponents.length; m++){
								if(activeComponents[m] == metadata.stream.components[k].name){
									scope.stream.components.push(metadata.stream.components[k]);
									break;
								}
							}
						}
					}
					
					
					
					
					//scope.stream.components = metadata.stream.components;
					for(var k = 0; k<scope.stream.components.length; k++){
		            	if(labels!=null && k<labels.length){
		            		try {
		            			scope.stream.components[k].label = labels[k];
							} catch (e) {
								scope.stream.components[k].label = scope.stream.components[k].name;
								console.error("Component's label not valid");
							}
		            	}
		            	else
		            		scope.stream.components[k].label = scope.stream.components[k].name;
		            }
					
					for(var j = 0; j<scope.stream.components.length; j++){
	            	   var component  = scope.stream.components[j];
						colorIndex<chartColors.length?colorIndex++:colorIndex=0;
						chartData.push({"name":component.name, "key":component.label, "values":[],"color": chartColors[colorIndex]});
						scope.stream.chartData.push({"name":component.name, "key":component.label, "values":[],"color": chartColors[colorIndex]});
					}
					

					if(typeof metadata["dataset"]!='undefined' && metadata["dataset"]!=null && typeof metadata["dataset"].code!='undefined' && metadata["dataset"].code!=null){
						dataService.getMeasures(metadata["dataset"].code,user_token,filter,  0, 20, 'time%20desc').success((function(dataCallbackIndex){ 
							return function(data) {
								console.debug("getMeasures" , dataCallbackIndex, data);

								if(data.d.results!=null && data.d.results.length>0){
									data.d.results.reverse();
									scope.stream.tableDataValues = [];
									//scope.stream.chartData = [];
									// table data
									for(var k=0; k<data.d.results.length; k++){
					            		scope.stream.tableDataValues[k] = [$yuccaHelpers.utils.mongoDate2string(data.d.results[k]["time"])];
										for(var j = 0; j<scope.stream.components.length; j++){
											if(typeof data.d.results[k][scope.stream.components[j].name] != 'undefined' && data.d.results[k][scope.stream.components[j].name]!=null)
												scope.stream.tableDataValues[k].push(data.d.results[k][scope.stream.components[j].name]);
											else
												scope.stream.tableDataValues[k].push("-");
										}
					            	}

									// chart data
			            			//var colorIndex = 0;

									for(var j = 0; j<scope.stream.components.length; j++){
					            	   var component  = scope.stream.components[j];
					            	   
										chartData[j].values = [];

					            	   //var chartDataValues = [];
					            	    for(var k=0; k<data.d.results.length; k++){
						            	   if(data.d.results[k][component.name] !=null){
						            		   if(k==0){
						            			   scope.stream.components[j].lastValue = data.d.results[k][component.name];
						            			   scope.stream.components[j].lastUpdate = $yuccaHelpers.utils.mongoDate2string(data.d.results[k]["time"]);
						            		   }
						            		   chartData[j].values.push(createChartElement($yuccaHelpers.utils.mongoDate2millis(data.d.results[k]["time"]),  
						            				   data.d.results[k][component.name]));
						            		   //chartDataValues.push(createChartElement($yuccaHelpers.utils.mongoDate2millis(data.d.results[k]["time"]),  data.d.results[k][component.name]));
						            	   }
					            	    }

					            	  //  if(colorIndex<chartColors.length){
			                    	  //		colorIndex++;
			                    	  //	}
					            	  //  else
					            	  //  	colorIndex = 0;

					            	   //scope.stream.chartData.push({"key":component.label, "values":chartDataValues,"color": chartColors[colorIndex]});
					            	   
					            	    var maxMinValue = findMinMaxValue(chartData[j].values);
					            	   scope.stream.components[j].minXValue = maxMinValue[0];
					            	   scope.stream.components[j].maxXValue = maxMinValue[1];
					               }
									console.log("..", scope.stream);
					             	callbackInvoked = true;

					               dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
								}
							};
						})(metadata.code));
					}
					//else
					dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
					
					
					
				}).error(function(e){
					console.log("error", e);
					scope.debugMessages.push("Stream not found: " + scope.stream);
					
				});
					
					
        	}
        	else{
        		scope.debugMessages.push("Invalid stream definition: tenantCode: " + attr.tenantCode+ " - streamCode: "+ attr.streamCode + " - smartobjectCode: " + attr.smartobjectCode);
        	}
        	
            console.debug("attrs", attr);
            scope.widgetTitle = $yuccaHelpers.attrs.safe(attr.widgetTitle, null);
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);

        	//var start  = new Date().getTime();
        	//var callCounter = 0;
            $interval(function(){
            	if(callbackInvoked && windowActive){
            		//callCounter++;
            		//console.warn("in", windowActive,  (new Date().getTime() - start), callCounter);
            		callbackInvoked= false;
	            	for(var m=0; m<chartData.length; m++){
	            		scope.stream.chartData[m].values = chartData[m].values.slice();
	            	}
            	}
            }, 1000);

        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_monitor.html",
    '<div class="yucca-widget yucca-stream-monitor">\n' +
    '    <header class="yucca-stream-monitor-header" ng-show="widgetTitle!=null"> \n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-stream-monitor-content">\n' +
    '        <section class="yucca-stream-monitor-chart"  ng-show="panel==\'chart\'">\n' +
    '            <nvd3 options="options" data="stream.chartData"></nvd3>\n' +
    '            <div class="yucca-stream-monitor-chart-x-xAxis" ng-show="stream.chartData.length>0">\n'+
    '            	<div class="min-value"><span class="value-hour">{{stream.components[0].minXValue|date:"H:mm"}}</span><span class="value-date">{{stream.components[0].minXValue|date:"dd MMM yyyy"}}</span></div>\n'+
    '               <div class="max-value"><span class="value-hour">{{stream.components[0].maxXValue|date:"H:mm"}}</span><span class="value-date">{{stream.components[0].maxXValue|date:"dd MMM yyyy"}}</span></div>\n'+
    '            </div>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-monitor-data" ng-show="panel==\'data\'">\n' +
    '           <table class="yucca-stream-monitor-data-table">\n'+
    '               <thead>\n'+
    '                   <tr><th>Time</th><th ng-repeat="component in stream.components track by $index">{{component.label}}</th></tr>\n'+
    '               </thead>\n'+
    '               <tbody>\n' +
    '                   <tr ng-repeat="row in stream.tableDataValues track by $index">\n' +
    '                     <td ng-repeat="data in row track by $index">\n'+
    '                         <span class="yucca-stream-monitor-data-table">{{data}}</span> \n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +    
    '        <section class="yucca-stream-monitor-lastupdate-bar" ng-show="showLastUpdate">\n' +
    '            Updated at: {{lastupdate|date:"dd/MM/yyyy  H:mm"}}\n' + 
    '        </section>\n' + 
    '        <section class="yucca-stream-monitor-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Chart</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamMultistreamMap', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_multistream_map.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
            var user_token =  attr.userToken;
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'map');
        	scope.debugMessages = [];
            
            //[{stream:"", components: [{component:"",min:"",max:""}];
        	var streamsAttr = scope.$eval(attr.streams);
        	scope.streams  ={};
        	
        	var tenant_code = attr.tenantCode;
        	var domain = attr.domain;
        	var search_query = attr.searchQuery;
        	var opendata = null;
        	console.log("attr.opendata",attr.opendata);
        	if(typeof attr.opendata != 'undefined')
        		opendata = attr.opendata==="true"?true:false;

        	if(typeof streamsAttr!=undefined && streamsAttr!=null && streamsAttr.length >0){
        		//stream
        	}
        	else{
        		metadataService.findMetadata(tenant_code, domain, search_query, opendata, user_token).success(function (metadataList){
        			console.log("metadataList",metadataList);
        		}).error(function(){
					scope.debugMessages.push("No data found: tenant=" + tenant_code +", domain=" + domain + ", search_query="+ search_query + ", opendata="+opendata);
				});
        		
        	}

            console.debug("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_multistream_map.html",
    '<div class="yucca-widget yucca-stream-multistream-map">\n' +
    '    <header class="yucca-stream-multistream-map-header">\n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-stream-multistream-map-content">\n' +
    '        <section class="yucca-stream-multistream-map-data">\n' +
    '           <table class="yucca-stream-multistream-map-table">\n'+
    '               <tbody ng-repeat="stream in streams track by $index" >\n' +
    '                   <tr>\n' +
    '                     <td class="yucca-stream-multistream-map-stream-row" colspan="100%">\n'+
    '                         <span class="yucca-stream-multistream-map-component">{{stream.name}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '                   <tr ng-repeat="component in stream.components track by $index">\n' +
    '                     <td class="yucca-stream-multistream-map-component-name"><span title="Phenomenon: {{component.phenomenon}}">{{component.name}}</span></td>\n' +
    '                     <td class="yucca-stream-multistream-map-component-bullet"><span class="yucca-stream-multistream-map-bullet bullet-{{component.bulletLevel}}" title="{{component.bulletsLevel}}"></span></td>\n' +
    '                     <td class="yucca-stream-multistream-map-component-value" title="Updated at: {{component.lastUpdate|date:\'MM/dd/yyyy  H:mm\'}}"><span>{{component.lastValue}}</span> <span class="yucca-stream-multistream-component-measureunit">{{component.measureunit}}</span> </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-multistream-map-lastupdate-bar">\n' +
    '            Updated at: {{lastupdate|date:"MM/dd/yyyy  H:mm"}}\n' + 
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamMultistreamStats', ['metadataService','dataService', '$yuccaHelpers', 'leafletData',
    function (metadataService, dataService, $yuccaHelpers, leafletData) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_multistream_stats.html',
        link: function(scope, elem, attr) {

        	scope.xAxisTickFormatFunction = function(){
                return function(d) {
                    return  d3.time.format("%H:%M:%S")(new Date(d));
                  };
            };
            
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'map');
        	var valueFormatFunction = function(d){
   				return parseInt(d);
    	    };
            
            var createTimeKey = function(data){
                return data.hour;
            }

            var minData = null;
            var maxData = null;
            var minMarkerWidth = 40;
            var maxMarkerWidth  = 80;

            scope.mapId = "map"+new Date().getTime();
            var computeStatistics = function(){
                for(var k in scope.allData){
                    if(scope.allData[k].hasOwnProperty('tableData')){
                        var data =  scope.allData[k].tableData[1];
                        if(minData==null || data<minData)
                            minData = data;
                        if(maxData==null || data>maxData)
                            maxData = data;
                    }
                    
                }
                console.log("min max", minData, maxData);
            };

            scope.refreshMarker = function(){

                console.log("scope.allData", scope.allData);
                scope.mapData.markerstyles = [];
                var dataAtTime = scope.allData[scope.currentTimeStats];
                console.log("allData",scope.allData);
                if(!$yuccaHelpers.utils.isEmpty(dataAtTime)){
                    console.log("dataAtTime",dataAtTime);
                    for (var i = 0; i < scope.allData.datasetsCode.length; i++) {
                        var data = parseFloat(dataAtTime.tableData[i+1]).toFixed(1);
                        data = (data === "NaN") ? 0 : data;
                        console.log("data", data);
                        var percent = (data-minData)/(maxData-minData);
                        var size = parseInt(minMarkerWidth + (maxMarkerWidth-minMarkerWidth)*percent);
                        var datasetCode = scope.allData.datasetsCode[i];
                        scope.mapData.markerstyles.push(".marker"+datasetCode+
                            "{font-size: "+(size/2.2)+"px; line-height:"+(size)+"px; " + 
                            "border-color:"+computeColor(data, 1)+"; background-color:"+computeColor(data, .5)+";}");
                        var icon = {type: 'div',
                                    iconSize: [size, size],
                                    className: "marker marker"+datasetCode,
                                    popupAnchor:  [0, 0],
                                    html: data
                        };

                        scope.mapData.markers["m_"+ datasetCode].icon = icon;
                    }
                }
//                leafletData.getMap().then(function (map) {
//                	console.warn("bounds", bounds);
//                    map.fitBounds(bounds);
//                });
            };
            
            var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, 300);
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'lineChart');
            var chartColors =  scope.$eval(attr.chartColors);
            
        	var toolTipContentFunction = function(key, x, y, e, graph) {
        			console.log("key", key);
        			var dataIndex  = key.index;
        			var tooltip="";
        			if(chartType == 'lineChart')
        				tooltip=key.point.tooltip;
        			else
        				tooltip=key.data.tooltip;
        	    	return  tooltip;
        		};
            //id="nvDataChart2"  height="300" xAxisTickFormat="xAxisTickFormatFunction()" showXAxis="true" showYAxis="true" tooltips="true" interactive="true" objectEquality="true"
        	
        	scope.options = {
    			chart: {
    				type: chartType,
    	            height: chartHeight,
    	            margin : {
	                    top: 24,
	                    right: 24,
	                    bottom: 24,
	                    left: 36
    	            },
    	            interpolate: 'basis',
    	            x: function(d){return d.x;},
    	            y: function(d){return d.y;},
    	            showValues: true,
    	            showLegend: false,
	                valueFormat: valueFormatFunction,
	                duration: 500,
	                showXAxis: true,
	                xAxis: {
	                    axisLabel: 'Time' + $yuccaHelpers.odata.timeGroup2resultKey(timeGroupBy),
	                },
	                yAxis: {
	                    axisLabel: '',
	                    axisLabelDistance:-10
	                },
	                tooltip:{
	                	contentGenerator: toolTipContentFunction
	                }
	            }
	        };
            
            scope.maxStats = 23;
            scope.allData = {};
            scope.mapData = {"markers": {},"markerstyles": []};
            var bounds = [];

            scope.currentTimeStats=5;

            var tableData = [];
            scope.allData.tableHeader = ["Time"];
            scope.allData.datasetsCode = [];
           
            var markerColor = ["#009100","#9ade00", "#edd400", "#f57900", "#cc0000"];
            var computeColor = function(value, alpha){
                var result = markerColor[2];
                if(maxData-minData!=0){
                    var percent = (value-minData)/(maxData-minData);
                    var colorIndex = parseInt(percent*markerColor.length);
                    if(colorIndex>=markerColor.length)
                        colorIndex = markerColor.length-1;
                    result = markerColor[colorIndex];
                }
                if(typeof result == 'undefined')
                    result = markerColor[2];
                return "rgba(" + $yuccaHelpers.utils.hex2Rgb(result) + "," + alpha + ")";
            };

            var addData  = function(metadata, dataset){
                scope.allData.datasetsCode.push(metadata.code);
                scope.allData.tableHeader.push(metadata.code);
                for (var i = 0; i < dataset.data.length; i++) {
                    var data = dataset.data[i];
                
                    // table
                    var timeKey = createTimeKey(dataset.data[i]);
                    if(!scope.allData[timeKey] || scope.allData[timeKey]==null){
                        scope.allData[timeKey]= {};
                        scope.allData[timeKey].tableData = [];
                        scope.allData[timeKey].tableData.push(data.hour);
                    }
                    scope.allData[timeKey].tableData.push(data.value_sts);
                }

                // map
                if(!$yuccaHelpers.utils.isEmpty(metadata.stream) && !$yuccaHelpers.utils.isEmpty(metadata.stream.smartobject.latitude)){

                	var marker = { lat: parseFloat(metadata.stream.smartobject.latitude),
                    			   lng: parseFloat(metadata.stream.smartobject.longitude), 
                    			   message: metadata.code};

                    var icon = {type: 'div',
                        className: "marker marker"+metadata.code,
                        popupAnchor:  [0, 0],
                        html: '-'
                    };

                    marker.icon = icon;

                    scope.mapData.markers["m_"+ metadata.code] = marker;
                    scope.mapData.markerstyles.push(".marker"+metadata.code+"{border-radius: 100%;width:30px; height:30px;border:solid 2px red}");

                    bounds.push([marker.lat, marker.lng]);
                    
                    leafletData.getMap().then(function (map) {
                    	map.invalidateSize();
                    	map.fitBounds(bounds, {padding: [32, 32]});
                    });
                }
            };
            
            var decodedDateFilter = $yuccaHelpers.odata.decodeDateFilter(attr);
            var timeFilter = decodedDateFilter.timeFilter;
            var timeGroupBy = $yuccaHelpers.attrs.safe(attr.timeGroupBy, $yuccaHelpers.odata.extractTimeGroupFilter(decodedDateFilter.minDateMillis, decodedDateFilter.maxDateMillis));
            

            //scope.widgetTitle = attr.widgettitle;
            var datasetsKey = scope.$eval(attr.datasets);

            if(datasetsKey && datasetsKey!=null && datasetsKey.length>0){
                for (var i = 0; i < datasetsKey.length; i++) {
                	
                	var tenant_code = datasetsKey[i][0];
        			var dataset_code = datasetsKey[i][1];

                    metadataService.getDatasetMetadata(tenant_code, dataset_code).success(
                        function(result) {
                            var metadata = result; //result.d.results[0];

                        	var size = Object.keys(result).length;
                            
                            if (size>0){
                            	if (metadata && metadata!=null) {
                            	
	                    			dataService.getMeasuresStats(metadata.dataset.code, user_token, timeGroupBy, 'avg,value', timeFilter,  null, null, "year,month,dayofmonth,hour").success( function(response) {
	                                    console.log('response', response);
	                                    var dataRow = {"key":metadata.code, 
	                                                   "metadata": metadata, 
	                                                   "data":response.d.results};
	
	                                    addData(metadata, dataRow);
	                                    computeStatistics();
	                                    scope.refreshMarker();
	                                })
	                                .error(function(response) {
	                                    console.error('getDatasetMetadata: error', response);
	                                });
                            	}
                            }
                        }       
                    );
                }
            }
            
            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
    	}
    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_multistream_stats.html",
		'<div class="yucca-widget yucca-stream-multistream-stats">\n' +
	    '    <header class="yucca-stream-multistream-stats-header">\n' +
	    '        {{widgetTitle}}\n' +
	    '    </header>\n' +
	    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
	    '    <div class="yucca-stream-multistream-stats-content">\n' +
	    '        <section class="yucca-stream-multistream-stats-map" ng-show="panel==\'map\'">\n' +
	    '           <style>.marker{border-radius: 100%;border:solid 4px;background-color: white; text-align: center;padding-top: -8px;}</style>\n' +
	    '           <style ng-repeat="style in mapData.markerstyles track by $index">{{style}}</style>\n' +
	    '           <leaflet id="{{mapId}}" width="100%" height="300px" markers="mapData.markers"></leaflet>\n' +
	    '           <div class="range-panel"><div class="range-min">0</div><div class="range-container">\n' +
	    '                <div class="range-value">{{currentTimeStats}} h</div>\n' +
	    '                <input type="range" name="points" min="0" max="{{maxStats}}" '+
	    '                    ng-model="currentTimeStats" ng-change="refreshMarker()" class="range-input"></div>\n' +
	    '               <div class="range-max">{{maxStats}}</div>\n'+
	    '           </div> \n' +
	    '        </section>\n' +
//	    '        <section class="yucca-stream-multistream-stats-chart" ng-show="panel==\'chart\'">\n' +
//	    '            <nvd3 options="options" data="chartData"></nvd3>\n' +
//	    '        </section>\n' +
	    '        <section class="yucca-stream-multistream-stats-data" ng-show="panel==\'data\'" >\n' +
	    '           <table class="yucca-stream-multistream-stats-table">\n'+
	    '               <thead>\n' +
	    '                   <tr><th ng-repeat="titles in allData.tableHeader track by $index">{{titles}}</th></tr>\n' +
	    '               </thead>\n' +
	    '               <tbody>\n' +
	    '                   <tr ng-repeat="(key, value) in allData track by $index">\n' +
	    '                     <td ng-repeat="data in value.tableData track by $index">{{data}}</td>\n' +
	    '                   </tr>\n' + 
	    '               </tbody>\n' +
	    '           </table>\n' +
	    '           <div class="yucca-stream-multistream-stats-component" ng-repeat="(key, value) in lastMessage.values[0].components">' +
	    '               <div class="yucca-stream-multistream-stats-component-key">{{key}}</div>\n' +
	    '               <div class="yucca-stream-multistream-stats-component-value">{{value}}</div>\n' +
	    '               <div class="yucca-stream-multistream-stats-component-measure-unit">{{componentsMap[key].measureUnit}}</div>\n' +
	    '           </div>\n' +
	    '        </section>\n' +
	    '        <section class="yucca-stream-multistream-stats-data" ng-hide="allData!=null">\n' +
	    '           No data\n' +
	    '        </section>\n' +
	    '        <section class="yucca-stream-multistream-stats-total-count">\n' +
	    '            Total: {{totalCount}}\n' +
	    '        </section>\n' +
	    '        <section class="yucca-stream-multistream-stats-toolbar">\n' +
	    '            <a href ng-click="panel=\'map\'" ng-class="{active: panel == \'map\'}">Map</a> | <a href ng-click="panel=\'data\'" ng-class="{active: panel == \'data\'}">Data</a> \n' +
	    '        </section>\n' +
	    '    </div>\n' +
	    '    <footer>\n' +
	    '        <div class="credits-intro">powered by</div>\n' +
	    '        <a href="http://www.smartdataplatform.it/" target="_blank">\n' +
	    '          <i>SmartDataNet.it</i>\n' +
	    '        </a>\n' +
	    '    </footer>\n' +
	    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamMultistreamValue', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_multistream_value.html',
        link: function(scope, elem, attr) {
        	
        	scope.debug = attr.debug==="true"?true:false;
            var user_token =  attr.userToken;
        	scope.debugMessages = [];
            
            //[{stream:"", components: [{component:"",min:"",max:""}];
        	var streamsAttr = scope.$eval(attr.streams);
        	scope.streams  ={};
        	scope.lastupdate =  new Date();

        	
        	var refershDataBullet = function(component){
        		var result = "";
        		var value =  	parseFloat(component.lastValue);
        		if(value!=null){
            		var result = "ok";
        			if((component.minWarning != '-' && value < component.minWarning) || 
        					(component.maxWarning != '-' && value > component.maxWarning ))
        				result = "warning";
        			if((component.minCritical != '-' && value < component.minCritical) || 
        					(component.maxCritical != '-' && value > component.maxCritical))
        				result = "critical";
        		
        		}
        		return result;
        	};
        	
    	    var dataCallback = function(message, dataCallbackIndex) {
               var messageBody = JSON.parse(message.body);
               if(typeof dataCallbackIndex == undefined || dataCallbackIndex == null){
            	   dataCallbackIndex = message.headers.destination.replace("/topic/output.", "");
//            		   "/topic/output.cittato_aria.9610f4fc-1535-4d09-c596-76dc0a5a339c_AQS_001"            	   
               }
               var newValues = messageBody.values[0];
               scope.lastupdate = newValues.time;
               for(var j = 0; j<scope.streams[dataCallbackIndex].components.length; j++){
            	   var component  = scope.streams[dataCallbackIndex].components[j];
            	   for (var componentKey in newValues.components) {
            		    if (newValues.components.hasOwnProperty(componentKey) && componentKey == component.name) {
            		    	scope.streams[dataCallbackIndex].components[j].lastValue = newValues.components[componentKey];
            		    	scope.streams[dataCallbackIndex].components[j].bulletLevel = refershDataBullet(scope.streams[dataCallbackIndex].components[j]);
            		    	
            		    }
            	   }
               }
    	    };
    	    
  
    	    if(typeof streamsAttr!=undefined && streamsAttr!=null && streamsAttr.length >0){
        		for (var i = 0; i < streamsAttr.length; i++) {
					var stream = streamsAttr[i];
					metadataService.getStreamMetadata (stream.tenantCode, stream.streamCode, stream.smartobjectCode, user_token).success(function(metadata){
						var s = {};
						
						s.name = metadata.name;
						s.components =[];
						for(var a=0; a<streamsAttr.length; a++){ // loop on streams attribute from client
							if(streamsAttr[a].tenantCode == metadata.tenantCode && 
								streamsAttr[a].streamCode == metadata.stream.code && 
								streamsAttr[a].smartobjectCode == metadata.stream.smartobject.code){  // if the stream loaded is the stream attribute
									for(var c=0; c<streamsAttr[a].components.length; c++){ //loop on components of the stream attribute
										for(var c1=0; c1<metadata.stream.components.length; c1++){ // loop on components of the stream loaded
										if(metadata.stream.components[c1].name == streamsAttr[a].components[c].name){
											var c2 = {};
											c2.name = metadata.stream.components[c1].name;
											c2.phenomenon = metadata.stream.components[c1].phenomenon;
											c2.measureunit = metadata.stream.components[c1].measureunit;
											c2.label = $yuccaHelpers.attrs.safe(streamsAttr[a].components[c].label, c2.name);
											c2.minWarning = $yuccaHelpers.attrs.safe(streamsAttr[a].components[c].minWarning, "-");
											c2.minCritical = $yuccaHelpers.attrs.safe(streamsAttr[a].components[c].minCritical, "-");
											c2.maxWarning = $yuccaHelpers.attrs.safe(streamsAttr[a].components[c].maxWarning, "-");
											c2.maxCritical = $yuccaHelpers.attrs.safe(streamsAttr[a].components[c].maxCritical, "-");
											c2.bulletsLevel  = "Min Critical: " +c2.minCritical + " \u000d " +
																"Min Warning: " +c2.minWarning + " \u000d" +
																"Max Warning: " +c2.maxWarning+ " \u000d" +
																"Max Critical: " +c2.maxCritical;
											s.components.push(c2);
									
										}
									}
								}
							}
						}
						scope.streams[ metadata.code] = s;
						if(typeof metadata["dataset"]!='undefined' && metadata["dataset"]!=null && typeof metadata["dataset"].code!='undefined' && metadata["dataset"].code!=null){
							console.debug("load past data");
							dataService.getMeasures(metadata["dataset"].code, user_token,null,  0, 1, 'time%20desc').success((function(dataCallbackIndex){ 
								return function(data) {
									console.debug("getMeasures" , dataCallbackIndex, data);
									if(data.d.results!=null && data.d.results.length>0){
										for(var j = 0; j<scope.streams[dataCallbackIndex].components.length; j++){
						            	   var component  = scope.streams[dataCallbackIndex].components[j];
						            	   if(data.d.results[0][component.name] !=null){
						            		   scope.streams[dataCallbackIndex].components[j].lastValue = data.d.results[0][component.name];
						            		   scope.streams[dataCallbackIndex].components[j].lastUpdate = $yuccaHelpers.utils.mongoDate2string(data.d.results[0]["time"]);
						            		   scope.streams[dataCallbackIndex].components[j].bulletLevel = refershDataBullet(scope.streams[dataCallbackIndex].components[j]);
						            	   }
						               }
						               dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
									}
									};
							})(metadata.code));
						}
						else
							dataService.getLastValue(metadata.tenantCode, metadata.stream.code, metadata.stream.smartobject.code, user_token, dataCallback, metadata.code);
						
						
						
					}).error(function(){
						scope.debugMessages.push("Stream not found: " + stream);
						
					});
					
					
				}
        	}
        	else{
        		scope.debugMessages.push("Invalid streams definition: " + streamsAttr + " - streams must be an array like this [{'tenantCode':'...', 'streamCode':'...', 'smartobjectCode':'...', components: [{component:'',min:'',max:''}], ...");
        	}
        	
            console.debug("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);


        }

    };
}]);

yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_multistream_value.html",
    '<div class="yucca-widget yucca-stream-multistream-value">\n' +
    '    <header class="yucca-stream-multistream-value-header">\n' +
    '        {{widgetTitle}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-stream-multistream-value-content">\n' +
    '        <section class="yucca-stream-multistream-value-data">\n' +
    '           <table class="yucca-stream-multistream-value-table">\n'+
    '               <tbody ng-repeat="stream in streams track by $index" >\n' +
    '                   <tr>\n' +
    '                     <td class="yucca-stream-multistream-value-stream-row" colspan="100%">\n'+
    '                         <span class="yucca-stream-multistream-value-component">{{stream.name}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '                   <tr ng-repeat="component in stream.components track by $index">\n' +
    '                     <td class="yucca-stream-multistream-value-component-name"><span title="Phenomenon: {{component.phenomenon}}">{{component.label}}</span></td>\n' +
    '                     <td class="yucca-stream-multistream-value-component-bullet"><span class="yucca-stream-multistream-value-bullet bullet-{{component.bulletLevel}}" title="{{component.bulletsLevel}}"></span></td>\n' +
    '                     <td class="yucca-stream-multistream-value-component-value" title="Updated at: {{component.lastUpdate|date:\'MM/dd/yyyy  H:mm\'}}"><span>{{component.lastValue}}</span> <span class="yucca-stream-multistream-component-measureunit">{{component.measureunit}}</span> </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-multistream-value-lastupdate-bar">\n' +
    '            Updated at: {{lastupdate|date:"MM/dd/yyyy  H:mm"}}\n' + 
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);


yuccaWidgetsModule.directive('ngYuccaStreamTweetStats', ['metadataService','dataService', '$yuccaHelpers',
    function (metadataService, dataService,$yuccaHelpers) {
    'use strict';

    return {
        restrict: 'E',
        scope: {},
        templateUrl:'template/stream_tweet_stats.html',
        link: function(scope, elem, attr) {

   
        	var chartHeight = $yuccaHelpers.attrs.num(attr.chartHeight, 100, null, 300);
            var chartType = $yuccaHelpers.attrs.safe(attr.chartType, 'lineChart');
            var chartColors =  scope.$eval(attr.chartColors);
            scope.panel = $yuccaHelpers.attrs.safe(attr.landingPanel, 'chart');

            if(typeof chartColors == 'undefined' || chartColors == null ||chartColors.length==0){
            	chartColors = Constants.LINE_CHART_COLORS;
            }

        	var valueFormatFunction = function(d){
   				return parseInt(d);
    	    };
        	
        	var toolTipContentFunction = function(key, x, y, e, graph) {
        			console.log("key", key);
        			var dataIndex  = key.index;
        			var tooltip="";
        			if(chartType == 'lineChart')
        				tooltip=key.point.tooltip;
        			else
        				tooltip=key.data.tooltip;
        	    	return  tooltip;
        		};
        	
        	scope.options = {
    			chart: {
    				type: chartType,
    	            height: chartHeight,
    	            margin : {
	                    top: 24,
	                    right: 24,
	                    bottom: 24,
	                    left: 36
    	            },
    	            interpolate: 'basis',
    	            x: function(d){return d.x;},
    	            y: function(d){return d.y;},
    	            showValues: true,
    	            showLegend: false,
	                valueFormat: valueFormatFunction,
	                duration: 500,
	                showXAxis: true,
	                xAxis: {
	                    axisLabel: 'Time' + $yuccaHelpers.odata.timeGroup2resultKey(timeGroupBy),
	                },
	                yAxis: {
	                    axisLabel: '',
	                    axisLabelDistance:-10
	                },
	                tooltip:{contentGenerator: toolTipContentFunction}
	            }
	        };
            
            var user_token =  attr.userToken;
            var decodedDateFilter = $yuccaHelpers.odata.decodeDateFilter(attr);
            var timeFilter = decodedDateFilter.timeFilter;
            var timeGroupBy = $yuccaHelpers.attrs.safe(attr.timeGroupBy, $yuccaHelpers.odata.extractTimeGroupFilter(decodedDateFilter.minDateMillis, decodedDateFilter.maxDateMillis));
            scope.xAxisLabel = $yuccaHelpers.odata.timeGroupLabel(timeGroupBy);
            
            scope.statisticData = [];
            scope.chartData = [];
        	scope.statisticData.push({"label": "Tweets", "value": "-"});
        	scope.statisticData.push({"label": "Unique Author", "value": "-"});
        	scope.statisticData.push({"label": "Tweet/Hour", "value": "-"});
        	scope.statisticData.push({"label": "Tweet/Author", "value":  "-"});

        	var refreshStats = function(){
        		if(scope.statisticData[0].value>0 && scope.statisticData[1].value>0)
        			scope.statisticData[3].value = (parseInt(scope.statisticData[0].value)/parseInt(scope.statisticData[1].value)).toFixed(2);
        		else
        			scope.statisticData[3].value =  "-";

        	};
        	
        	scope.lastTweets = [];
        	scope.mostRetweeted = [];
        	
        	
            metadataService.getStreamMetadata(attr.tenantCode, attr.streamCode, attr.smartobjectCode).success(
                function(metadata) {
                	console.log("metadata",metadata);
        			//var metadata  ={dataset:{code:"ds_Raspberry_907"}, stream:{smartobject:{twtQuery:"raspberry pi"}}};
        			
                    scope.metadata = metadata;
                    
                    if(metadata.dataset.code!=null){
                    	
	                    // last tweet
                    	dataService.getSocialFeeds(metadata.dataset.code, user_token, timeFilter,  null, 10, "time desc").success( function(data) {
	                        	console.log("data",data);
	                        	for(var i=0; i<data.d.results.length; i++){
	                        		scope.lastTweets.push($yuccaHelpers.render.completeTweet(data.d.results[i], $yuccaHelpers.utils.mongoDate2string(data.d.results[i].createdAt)));
	                        	}
	                        	
	                        	scope.statisticData[0].value=data.d.__count;
	                        	refreshStats();
	                    	}
	                    );

	                    // most retweeted
	                    dataService.getSocialFeeds(metadata.dataset.code, user_token, timeFilter,  null, 10, "retweetCount desc").success( function(data) {
	                        	console.log("data",data);
	                        	for(var i=0; i<data.d.results.length; i++){
	                        		scope.mostRetweeted.push($yuccaHelpers.render.completeTweet(data.d.results[i], $yuccaHelpers.utils.mongoDate2string(data.d.results[i].createdAt)));
	                        	}

	                   		}
	                    );

	                    // data statistic 
	                    dataService.getSocialFeedsStats(metadata.dataset.code,  user_token, timeGroupBy, 'sum,tweetid', timeFilter,  null, null, "year,month,dayofmonth,hour").success( function(statisticData) {
	                    	console.log("statisticData", statisticData);
	                    	var chartDataValues = [];
	            			var colorIndex = 0;

	                    	for(var i=0; i<statisticData.d.results.length; i++){
	                    		var data = statisticData.d.results[i];
	                    		var time  =$yuccaHelpers.odata.timeGroup2resultKey(timeGroupBy);
	                    		var tooltipText =  "<h3 class='yucca-stream-tweet-stats-tooltip-header'>";
	                    		tooltipText += $yuccaHelpers.utils.lZero(data['dayofmonth']) + "/" + $yuccaHelpers.utils.lZero(data['month']) +"/" + data['year'];
	                    		tooltipText +=  "</h3>";
	                    		tooltipText +=  "<p>Tweet :<strong>"+data['count']+"</strong></p>";

	                    		var element = {x:parseFloat(data[time]), y:parseFloat(data['count']), "tooltip":tooltipText };
	                    		if(colorIndex<chartColors.length){
	                    			element.color= chartColors[colorIndex];
	                    			colorIndex++;
	                    		}
	                    		chartDataValues.push(element);
	                    	}
	                    	// FIXME REMOVE
	                    	chartDataValues.sort((function(a, b) {return a.x - b.x;}));
	                    	scope.chartData.push({"key":"tweetData","values":chartDataValues});
	               
	                    });
	                    
	                    // unique author
	                    dataService.getSocialFeedsStats(metadata.dataset.code,  user_token, "iduser", 'first,tweetid', timeFilter,  null, 1, null).success( function(statisticData) {
	                    	console.log("statisticData author", statisticData);
                        	scope.statisticData[1].value=statisticData.d.__count;
                        	refreshStats();

	                    });
		                // tweet/hour
	                    dataService.getSocialFeedsStats(metadata.dataset.code,  user_token, "hour", 'sum,tweetid', timeFilter,  null, 1000, null).success( function(statisticData) {
	                    	console.log("statisticData tweet/hour", statisticData);
	                    	if(parseInt(statisticData.d.__count)>0){
		                    	var totalTweet  = 0;
		                    	for (var j = 0; j < statisticData.d.results.length; j++) {
		                    		totalTweet +=  parseInt(statisticData.d.results[j].count);
								}
		                    	scope.statisticData[2].value= (totalTweet/statisticData.d.__count).toFixed(2);
	                    	}
	                    });
                    };
                }
            );
            
           
            console.log("attrs", attr);
            scope.widgetTitle = attr.widgetTitle;
            scope.widgetIntro = $yuccaHelpers.attrs.safe(attr.widgetIntro, null);
            //attr.$observe('widgetTitle', function(value) {scope.widgetTitle = value;});

        }

    };
}]);
	
yuccaWidgetsTemplatesModule.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/stream_tweet_stats.html",
    '<div class="yucca-widget yucca-stream-tweet-stats">\n' +
    '    <header class="yucca-stream-tweet-stats-header">\n' +
    '        {{widgetTitle}} {{metadata.stream.smartobject.twtQuery}}\n' +
    '    </header>\n' +
    '    <div class="yucca-widget-intro" ng-show="widgetIntro!=null">{{widgetIntro}}</div>\n' +
    '    <div class="yucca-stream-tweet-stats-content">\n' +
    '        <section class="yucca-stream-tweet-stats-chart" ng-show="panel==\'chart\'"">\n' +
    '            <nvd3 options="options" data="chartData"></nvd3>\n' +
    '            <div class="yucca-stream-tweet-stats-xaxis-label">{{xAxisLabel}}</div>' +
    '        </section>\n' +
    '        <section class="yucca-stream-tweet-stats-data"  ng-show="panel==\'chart\'">\n' +
    '           <h4>Statistics</h4>\n' +
    '           <table class="yucca-stream-tweet-stats-table">\n'+
    '               <tbody>\n' +
    '                   <tr >\n' +
    '                     <td ng-repeat="data in statisticData track by $index">\n'+
    '                         <span class="yucca-stream-tweet-stats-value">{{data.value}}</span><span class="yucca-stream-tweet-stats-label"> {{data.label}}</span>\n' +
    '                     </td>\n' +
    '                   </tr>\n' + 
    '               </tbody>\n' +
    '           </table>\n' +
    '        </section>\n' +    
    '        <section class="yucca-stream-tweet-stats-last-tweet" ng-show="panel==\'lastTweet\'" >\n' +
    '           <h4>Last tweets</h4>\n' +
    '           <div class="yucca-stream-tweet-stats-last-tweet-content">\n'+
    '           	<div ng-repeat="tweet in lastTweets track by $index" class="yucca-stream-tweet-stats-tweet">\n'+
    '           		<div class="tweet-message">\n' +
    '           			<div class="tweet-profile-image"><a href="{{tweet.twitterUserLink}}" target="_blank" title="View user on twitter">\n' + 
    '							<img src="https://twitter.com/{{tweet.userScreenName}}/profile_image?size=normal" />\n'+
    '						</a></div>\n' +
    '           			<div class="tweet-author"><a href="{{tweet.twitterUserLink}}" target="_blank" title="View user on twitter">{{tweet.userScreenName}}</a>\n' + 
    '                           <a href="{{tweet.twitterLink}}" target="_blank" title="View on twitter" class="tweet-twitter-link"></a>\n' +
    '                       </div>\n' +
    '           			<div class="tweet-text" ng-bind-html="tweet.getTextPretty"></div>\n' +
    '           		</div>\n' +
    '           		<div class="tweet-info">\n' +
    '		           		<div class="tweet-statistic-icons">\n' +
    '           				<span class="tweet-retweet-icon">{{tweet.retweetCount}}</span>\n' +
    '           				<span  class="tweet-favorite-icon">{{tweet.favoriteCount}}</span>\n' +
    '           			</div>\n' +
    '           			<div class="tweet-date">{{tweet.createdAtFormatted}}</div>\n' +
    '           		</div>\n' +
    '               </div>\n' +
    '           </div>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-tweet-stats-most-retweet" ng-show="panel==\'mostRetweet\'" >\n' +
    '           <h4>Most retweeted</h4>\n' +
    '           <div class="yucca-stream-tweet-stats-most-retweet-content">\n'+
    '           	<div ng-repeat="tweet in mostRetweeted track by $index" class="yucca-stream-tweet-stats-tweet">\n'+
    '           		<div class="tweet-message">\n' +
    '           			<div class="tweet-profile-image"><a href="{{tweet.twitterUserLink}}" target="_blank" title="View user on twitter">\n' + 
    '							<img src="https://twitter.com/{{tweet.userScreenName}}/profile_image?size=normal" />\n'+
    '						</a></div>\n' +
    '           			<div class="tweet-author"><a href="{{tweet.twitterUserLink}}" target="_blank" title="View user on twitter">{{tweet.userScreenName}}</a>\n' + 
    '                           <a href="{{tweet.twitterLink}}" target="_blank" title="View on twitter" class="tweet-twitter-link"></a>\n' +
    '                       </div>\n' +
    '           			<div class="tweet-text" ng-bind-html="tweet.getTextPretty"></div>\n' +
    '           		</div>\n' +
    '           		<div class="tweet-info">\n' +
    '		           		<div class="tweet-statistic-icons">\n' +
    '           				<span class="tweet-retweet-icon">{{tweet.retweetCount}}</span>\n' +
    '           				<span  class="tweet-favorite-icon">{{tweet.favoriteCount}}</span>\n' +
    '           			</div>\n' +
    '           			<div class="tweet-date">{{tweet.createdAtFormatted}}</div>\n' +
    '           		</div>\n' +
    '               </div>\n' +
    '           </div>\n' +
    '        </section>\n' +
    '        <section class="yucca-stream-tweet-stats-toolbar">\n' +
    '            <a href ng-click="panel=\'chart\'" ng-class="{active: panel == \'chart\'}">Statistics</a> | <a href ng-click="panel=\'lastTweet\'" ng-class="{active: panel == \'lastTweet\'}">Last Tweet</a> | <a href ng-click="panel=\'mostRetweet\'" ng-class="{active: panel == \'mostRetweet\'}">Most Retweet</a> \n' +
    '        </section>\n' + 
    '    </div>\n' +
    '    <footer>\n' +
    '        <div class="yucca-credits-intro">powered by</div>\n' +
    '        <a href="http://www.smartdatanet.it/" target="_blank">\n' +
    '          <i>SmartDataNet.it</i>\n' +
    '        </a>\n' +
    '    </footer>\n' +
    '</div>\n'
    );
}]);
