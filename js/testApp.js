angular.module("testApp",["happyTable"])
.controller("testCtrl",function($scope,$sce){
	/*
	$scope.schema = [
		{
			"name":"id",
			"hidden":true
		},
		{
			"label":"Name",
			"name":"name",
			"element":"input",
			"inputType":"text",
			"type":"text",
			"required":true,
			"unique":true,
			"hidden":false
		},
		{
			"label":"Username",
			"name":"username",
			"element":"input",
			"inputType":"text",
			"type":"text",
			"required":true,
			"unique":true,
			"hidden":false
		},
		{
			"label":"Email",
			"name":"email",
			"element":"input",
			"inputType":"email",
			"type":"email",
			"required":true,
			"unique":true,
			"hidden":false
		},
		{
			"label":"Mobile",
			"name":"mobile",
			"element":"input",
			"inputType":"text",
			"type":"mobile",
			"prefix":"+91",
			"required":true,
			"unique":true,
			"hidden":false
		},
		{
			"label":"Type",
			"name":"type",
			"element":"select",
			"type":"select",
			"options":[
				{
					"label":"Delta",
					"value":0
				},
				{
					"label":"Beta",
					"value":1
				}
			],
			"required":true,
			"hidden":false
		}
	];

	$scope.data = [
		{
			"id":"3ppx84",
			"name":"Indian Academy of Pediatrics",
			"username":"IAP_Delhi",
			"email":"123@gmail.com",
			"mobile":"9876543210",
			"type":1,
			"isDeletable":false,
			"undeletableReason":"This body can't be deleted as it is associated with some subordinate bodies."
		},
		{
			"id":"86ym8b",
			"name":"National Neonatology Forum",
			"username":"NNF_Delhi",
			"email":"345@gmail.com",
			"mobile":"9876543218",
			"type":0,
			"isDeletable":true
		}
	]

	$scope.settings = {
		"getDataUrl":"/get/productTypes",
		"schema":[
			{
				"name":"_id",
				"primary":true,
				"hidden":true
			},
			{
				"label":"Name",
				"name":"name",
				"element":"input",
				"inputType":"text",
				"type":"text",
				"required":true,
				"unique":true,
				"hidden":false
			},
			{
				"label":"Code",
				"name":"code",
				"element":"input",
				"inputType":"text",
				"type":"text",
				"required":true,
				"unique":false,
				"hidden":false
			},
			{
				"label":"Tax Percent",
				"name":"taxPercent",
				"element":"input",
				"inputType":"number",
				"type":"number",
				"min":0,
				"max":100,
				"required":true,
				"unique":false,
				"hidden":false
			}
		],
		"updateDataUrl":"/update/productTypes",
		"tableName":"Product Types",
		"rowNomenclature":"product type",
		"rowNomenclaturePlural":"product types"
	}*/
	/*var schema = [
		{
			"name":"invoiceNumber",
			"label":"Invoice Number",
			"prefix":"GST",
			"type":"number",
			"viewLength":3,
			"min":1,
			"invalidValues":[{
				"value": 2, 
				"reason": "Invoice with number 002 exists. Please change it."
			}],
			"required":true
		},
		{
			"name":"invoiceYear",
			"label":"Invoice Year",
			"type":"select",
			"options":[
				{
					"value": "2016-2017",
					"label": "2016-2017"
				},
				{
					"value": "2017-2018",
					"label": "2017-2018"
				},
				{
					"value": "2018-2019",
					"label": "2018-2019"
				}
			],
			"required":true
		},
		{
			"name":"invoiceDate",
			"label":"Invoice Date",
			"type":"date",
			"changes":["nickname"],
			"required":true
		},
		{
			"name":"nickname",
			"label":"Nickname",
			"type":"text",
			"required":true
		}
	]
	var data = {
		"invoiceNumber": 1,
		"invoiceYear": "2017-2018",
		"invoiceDate": new Date(),
		"nickname": "devu"
	}


	$scope.settings = {
		"schema": schema,
		"data": data,
		onUpdate: function(field,newVal,oldVal){
		}
	}

	$scope.$watch("data",function(){
		
	})*/
	window.$scope = $scope;
	$scope.settings = {
		schema: [{
			name: "fName",
			label: "First name",
			type: "text",
			required: true
		},{
			name: "education",
			label: "Education",
			type: "table",
			viewGenerator: function(educations){
				return $sce.trustAsHtml(
					educations.map(education =>
						`<div class="ui basic label">
							${education.level} <div class="detail">${education.field}</div> 
						</div>`
					).join(" ")
				)
			},
			styles: {
				"min-width": "25em"
			},
			tableSettings: {
				schema: [{
					name: "level",
					label: "Level",
					type: "text",
					required: true
				},{
					name: "field",
					label: "Field",
					type: "text",
					required: true
				}],
				data: [],
				tableVariation: "embedded",
				parentTable: $scope.settings,
				reorderable: true,
				isReorderConfirmationCompact: true,
				unorderable: false,
				rowNomenclature: "education",
				rowNomenclaturePlural: "educations"
			}
		}],
		data: [{
			fName: "Devansh",
			education: [{
				level: "HSC",
				field: "Science"
			},{
				level: "BE",
				field: "Computers"
			}]
		}]
	}
});