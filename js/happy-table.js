angular.module("happyTable",["angular-loading-bar","ui.sortable","ui.date","ui.mask"])
.directive("happyTable",function($timeout){
	return {
		scope:{
			settings: "=",
			type: "@",
			model: "=?ngModel"
		},
		controller: "happyTableCtrl",
		templateUrl: function(tElement,tAttrs){
			if(tAttrs.type == "definition"){
				return "../partials/happy-definition-table.html";
			}else{
				return "../partials/happy-row-table.html";
			}
		},
		link: function(scope,elem,attrs){
		}
	}
})
.filter("getHappySelectLabel", function () {
	return function(value,field,row){
		var options = (row && row.isEditing) ? (field.tempOptions || field.options) : field.options
		if(field.type == "select" && typeof options !== "function"){
			for (var j = 0; j < options.length; j++) {
				if(options[j].value == value){
					return options[j].label;
				}
			}
		}else{
			return value;
		}
	};
})
.filter("viewLength", function () {
	return function(value,length){
		if(length && value !== undefined){
			var _value = value.toString();
			while(_value.length < length){
				_value = "0" + _value;
			}
			return _value;
		}else{
			return value;
		}
	};
})
.filter("happyDate", function ($filter) {
	return function(value){
		if(value && angular.isDate(value)){
			return $filter("date")(value,"dd-MM-yyyy");
		}else{
			return value;
		}
	};
})
.filter("happyCurrency", function ($filter) {
	return function(value,field){
		if( (field === undefined || field.viewType == "currency") && value !== undefined){
			return value.toLocaleString("en-IN");
		}else{
			return value;
		}

	};
})
.filter("happyEmbeddedTable", function ($filter) {
	return function(value,field){
		if(value && field.type == "table"){
			return field.viewGenerator(value);
		}else{
			return value;
		}

	};
})
.filter("happyFieldViewValue", function ($filter) {
	return function(value,field,row){
		if(value !== undefined && value !== ""){
			var f0 = $filter("getHappySelectLabel")(value,field,row);
			var f1 = $filter("happyDate")(f0);
			var f2 = $filter("viewLength")(f1,field.viewLength);
			var f3 = $filter("happyCurrency")(f2,field)
			var f4 = $filter("happyEmbeddedTable")(f3,field)
			return f4;
		}else{
			return field.emptyViewValue;
		}
	}
	
})
.filter("happySelectSorter", function ($filter) {
	return function(data,field,reverse){
		if(field){
			if(field.element !== "select"){
				return data;
			}else{
				// add _temp aka label
				angular.forEach(data,function(row){
					row._temp = $filter("getHappySelectLabel")(row[field.name],field)
				});

				// orderBy _temp aka label
				var orderedData = $filter("orderBy")(data,"_temp",reverse)

				// remove _temp
				angular.forEach(orderedData,function(row){
					delete row._temp;
				});

				// return sorted
				return orderedData;
			}
		}else{
			return data;
		}
	};
})
.filter("happyFilter", function ($filter) {
	return function(data,query,schema){
		if(query){
			angular.forEach(data,function(row){
				angular.forEach(row,function(fieldValue,fieldName){
					for (var i = 0; i < schema.length; i++) {
						if(schema[i].name == fieldName){
							var field = schema[i];
							if(field.type == "select"){
								row["__temp" + fieldName + "Label"] = $filter("getHappySelectLabel")(fieldValue,field);
							}
							break;
						}
					}
				})
			})
			var filteredData = $filter("filter")(data,query);
			angular.forEach(filteredData,function(row){
				angular.forEach(row,function(fieldValue,fieldName){
					for (var i = 0; i < schema.length; i++) {
						if(schema[i].name == fieldName){
							var field = schema[i];
							if(field.type == "select"){
								delete row["__temp" + fieldName + "Label"];
							}
							break;
						}
					}
				})
			})
			return filteredData;
		}else{
			return data;
		}
	};
})
.controller("happyTableCtrl",function($scope,$http,$happyConfirm,$filter,$timeout,$element,$happyTableDimmer,$window,$location){

	// devStart
	// window[$scope.settings.tableName.replace(" ","") + "HappyTableCtrlScope"] = $scope;
	// devEnd
	window.$location = $location;

	$scope._ngExtend = angular.extend
	
	// =================================================================================
	// Helper Functions
	$scope.getDefinitionRow = function(field,data){
		var _data = data || $scope.data;
		for (var i = 0; i < _data.length; i++) {
			var fieldName;
			if(typeof field === "string"){
				fieldName = field;
			}else{
				fieldName = field.name;
			}
			if(Object.keys(_data[i]).indexOf(fieldName) > -1){
				return _data[i];
			}
		};
	}

	$scope.getDefinitionSchema = function(row){
		for (var i = 0; i < $scope.schema.length; i++) {
			if( Object.keys(row).indexOf($scope.schema[i].name) > -1){
				return $scope.schema[i];
			}
		};
	} 
	$scope.setHappyOrderField = function(field){
		if( angular.equals($scope.happyOrderField,field) ){
			if(!$scope.happyOrderReverse){
				$scope.happyOrderReverse = true;
			}else{
				$scope.resetSort();
			}
		}else{
			$scope.happyOrderField = field;	
			$scope.happyOrderReverse = false;
		}
	}
	$scope.resetSort = function(){
		$scope.happyOrderField = {};
		$scope.happyOrderReverse = false;
	}
	$scope.settings.resetSort = $scope.resetSort;

	$scope.permanentifySort = function(){
		$scope.data = $filter("orderBy")($scope.data, $scope.happyOrderField.name, $scope.happyOrderReverse);
		$scope.resetSort();

		$scope.settings.data = $scope.data; // becoz did orderBy
		
		var newData = $scope.data;
		var indexChanges = {};
		var primaryFieldName;
		for (var i = 0; i < $scope.schema.length; i++) {
			if($scope.schema[i].primary){
				primaryFieldName = $scope.schema[i].name;
			}
		}

		angular.forEach(newData,function(newRow,index){
			if(newRow.index !== index){
				indexChanges[newRow[primaryFieldName]] = index;
				newRow.index = index;
			}
		})

		if(Object.keys(indexChanges).length > 0){
			$scope.settings.onIndexUpdate(indexChanges);
		}
	}

	$scope.confirmPermanentifySort = function(event){
		$happyConfirm({
			"text": "Are you sure you want to make this sorting permanent?",
			"target": event.target,
			yes: function(){
				$scope.permanentifySort();
				$scope.$digest();
			}
		})
	}

	// =================================================================================
	// Manipulate data and schema to work
	$scope.init = function(){
		$scope.schema = $scope.settings.schema;
		$scope.data = $scope.settings.data;

		
		var makeSettingsWorkable = function(){
			$scope.settings.reorderable = !!$scope.settings.reorderable;
			$scope.settings.unorderable = !!$scope.settings.unorderable;
			$scope.settings.tableScrolling = !!$scope.settings.tableScrolling;
			$scope.settings.canPermenantifySort = !!$scope.settings.canPermenantifySort;
			$scope.settings.dontConfirmForCommitEditing = !!$scope.settings.dontConfirmForCommitEditing;
			$scope.settings.dontConfirmForCancelEditing = !!$scope.settings.dontConfirmForCancelEditing;
			$scope.settings.dontConfirmForCommitReordering = !!$scope.settings.dontConfirmForCommitReordering;
			$scope.settings.dontConfirmForCancelReordering = !!$scope.settings.dontConfirmForCancelReordering;
			$scope.settings.showLoaderOnEdit = !!$scope.settings.showLoaderOnEdit;

			
			
			$scope.settings.trigger = $scope.settings.trigger || {};

			$scope.settings.onUpdate = $scope.settings.onUpdate || angular.noop;
			$scope.settings.onIndexUpdate = $scope.settings.onIndexUpdate || angular.noop;
			$scope.settings.onChange = $scope.settings.onChange || angular.noop;
			$scope.settings.onInsert = $scope.settings.onInsert || angular.noop;
			$scope.settings.onDelete = $scope.settings.onDelete || angular.noop;
			$scope.settings.onCommit = $scope.settings.onCommit || angular.noop;
			$scope.settings.onUpdateCollection = $scope.settings.onUpdateCollection || angular.noop;
			$scope.settings.onEdit = $scope.settings.onEdit || angular.noop;
			$scope.settings.onCancel = $scope.settings.onCancel || angular.noop;
			$scope.settings.onAdd = $scope.settings.onAdd || angular.noop;

			$scope.settings.indexProp = $scope.settings.indexProp || "_index"; // 18-05-2018

			$scope.settings.waitingUpdates = {};

			$scope.happySortable = {disabled:true}; //TODO enhance

			$scope.settings.getParentTable = $scope.settings.getParentTable || function(){
				return {}
			} //TODO enhance

			$scope.settings.mobileBreakpoint = $scope.settings.mobileBreakpoint || 600;

			if($scope.settings.isForm){
				$scope.settings.tableStyles =  $scope.settings.tableStyles || ["compact","very basic","unstackable"];
			}else{
				$scope.settings.tableStyles = $scope.settings.tableStyles || ["compact","celled","unstackable"];
			}

			$scope.settings.rowNomenclature = $scope.settings.rowNomenclature || "row";
			$scope.settings.rowNomenclaturePlural = 
				$scope.settings.rowNomenclature.slice(-1) == "y" ?
					$scope.settings.rowNomenclature.slice(0,-1) + "ies"
				: $scope.settings.rowNomenclature + "s";

			$scope.happyFormModal = {}
		}
		makeSettingsWorkable();
		$scope.$watch(function(){return $scope.settings}, makeSettingsWorkable)


		
		$scope.settings.tableDimmer = $happyTableDimmer($element);

		$scope.tableType = $scope.type;
		if( $scope.tableType == "definition" ){
			var _data = [];
			angular.forEach($scope.data,function(fieldValue, fieldName){
				_data.push({[fieldName]: fieldValue});
			})
			$scope.data = _data;
			$scope.settings.data = $scope.data;
		}


		$scope.$watch(function(){return $scope.settings.data},function(){
			$scope.data = $scope.settings.data;
			angular.forEach($scope.data,function(row){
				row.isUndeletable = !!row.isUndeletable;
				if(!row.undeletableReason){
					row.undeletableReason = $scope.settings.defaultUndeletableReason;
				}
			})
		},true)

		$scope.$watch(function(){return $scope.settings.schema},function(){

			angular.forEach($scope.settings.schema,function(field,fieldIndex){

				switch(field.type){
					case "select":
					field.element = "select";
					break;

					case "email":
					field.element = "input";
					field.inputType = "email";
					field.showErrorAfterTouched = true;
					break;

					case "date":
					field.element = "input";
					field.inputType = "text";
					break;

					case "mobile":
					field.element = "input";
					field.inputType = "number";
					field.showErrorAfterTouched = true;
					break;

					case "number":
					field.element = "input";
					field.inputType = "number";
					break;

					case "checkbox":
					field.element = "input";
					field.inputType = "checkbox";
					break;

					case "table":
					break;

					default:
					field.element = "input";
					field.inputType = "text";
					break;					
				}

				field.hidden = !!field.hidden;
				field.required = !!field.required;
				field.unique = !!field.unique;
				if($scope.tableType == "definition"){
					field.shrink = field.shrink ? !!field.shrink : true;
					field.wrapField = !!field.wrapField;
				}else{
					field.shrink = !!field.shrink;
				}
				field.dontWrapSuffix = !!field.dontWrapSuffix;

				if(field.type == "select"){
					angular.forEach(field.options,function(option,optionIndex){
						if(typeof option == "string"){
							$scope.settings.schema[fieldIndex].options[optionIndex] = {
								"value": option,
								"label": option
							}
						}
					})
				}

				if(field.type == "table"){
					$scope.settings.hasEmbedded = true;
				}

				if(field.type == "date"){
					field.datepickerOptions = field.datepickerOptions || {};
					angular.extend(field.datepickerOptions,{
						"minDate": field.min,
						"maxDate": field.max
					})
				}
			})
			$scope.schema = $scope.settings.schema;

			angular.forEach($scope.data,function(row){
				row.callAllWatchers && row.callAllWatchers();
			})

			var _totalColumns = $filter("filter")($scope.schema,{"hidden":false}).length;
			$scope.totalColumns = 
				($scope.happySortable.disabled && !$scope.settings.hideAction) ?
					_totalColumns + 1
				: _totalColumns
		},true)

		if($scope.model){
			$scope.$watch("data",function(data){
				$scope.model = [];
				angular.forEach(data,function(row,i){
					$scope.model[i] = row.editingValues;
				})
			},true)
		}

		$scope.settings.focus = function(){
			angular.forEach($scope.data,function(row){
				if(row.isEditing){
					$scope.confirmCommitEditing(row);
				}
			})
		}
	}
	if(!$scope.settings.dontInit){
		$scope.init();
	}
	$scope.settings.init = $scope.init;



	// =================================================================================
	// New Row
	$scope.newRow = function(callback){
		var newRow = { "isNew":true, "isUndeletable": false };
		angular.forEach($scope.schema, function(field){
			if(field.type !== "table"){
				newRow[field.name] = field.defaultValue === undefined ? "" : field.defaultValue;
			}else{
				newRow[field.name] = [];
			}
		})
		$scope.settings.data.push(newRow);
		$scope.editRow(newRow,undefined,undefined,function(){
			callback && callback();
		})
		$scope.settings.onAdd(newRow);
	}
	$scope.settings.trigger.newRow = $scope.newRow;

	// =================================================================================
	// Reorder Row
	// TODO : dont change styles here
	$scope.happySortable = {
		disabled: true,
		handle: ".reorder",
		axis: "y",
		helper: function(event,ui){
			$tr = ui.clone();
			ui.find("td").each(function(index){
				$tr.find("td").eq(index).width($(this).outerWidth())
			})
			$tr.find("td").css("border-bottom","1px solid #e8e8e9");
			$tr.css("background-color","#fff")
			$tr.css("box-shadow","0 0 25px rgba(0,0,0,0.1)")
			return $tr;
		},
		start: function(event,ui){
			ui.placeholder.html(ui.helper.html());
		},
		sort: function(event,ui){
			ui.item.closest("tbody").find("tr").not(".ui-sortable-helper").find("td").css("border-bottom","");
			ui.placeholder.prev().find("td").css("border-bottom","1px solid rgba(34,36,38,.1)");
		},
		stop: function(event,ui){
			ui.item.closest("tbody").find("td").css("border-bottom","");
		}
	}
	$scope.reorderRows = function(){
		$scope.happyOrderField = {};
		$scope.happyOrderReverse = false;
		$scope.happySearch = undefined;
		$scope.happySortable.disabled = false;
		$scope._data = angular.copy($scope.data);
	}
	$scope.settings.trigger.startReordering = $scope.reorderRows

	// =================================================================================
	// Cancel Reordering
	$scope.cancelReordering = function(){
		$scope.data = angular.copy($scope._data);
		delete $scope._data;
		$scope.happySortable.disabled = true;
	}
	$scope.confirmCancelReordering = function(event){
		if( !angular.equals($scope.data,$scope._data) && !$scope.settings.dontConfirmForCommitReordering){
			$happyConfirm({
				"text": "Are you sure you want to cancel reordering?",
				"target": event.target,
				yes:function(){
					$scope.cancelReordering();
					$scope.$digest(); // we are using $.fn.click not ngClick
				}
			})
		}else{
			$scope.cancelReordering();
		}
	}
	$scope.settings.trigger.cancelReordering = $scope.cancelReordering

	// =================================================================================
	// Commit Reordering
	$scope.commitReordering = function(){
		var newData = $scope.data;
		var indexChanges = {};
		var primaryFieldName;
		for (var i = 0; i < $scope.schema.length; i++) {
			if($scope.schema[i].primary){
				primaryFieldName = $scope.schema[i].name;
			}
		}

		angular.forEach(newData,function(newRow,index){
			if(newRow.index !== index){
				indexChanges[newRow[primaryFieldName]] = index;
				newRow.index = index;
			}
		})

		if(Object.keys(indexChanges).length > 0){
			$scope.settings.onIndexUpdate(indexChanges);
		}

		delete $scope._data;
		$scope.happySortable.disabled = true;
	}
	$scope.settings.trigger.commitReordering = $scope.commitReordering
	$scope.confirmCommitReordering = function(event){
		if( !angular.equals($scope.data,$scope._data) && !$scope.settings.dontConfirmForCommitReordering ){
			$happyConfirm({
				"text": "Are you sure you want to commit reordering?",
				"target": event.target,
				yes:function(){
					$scope.commitReordering();
					$scope.$digest(); // we are using $.fn.click not ngClick
				}
			})
		}else{
			$scope.commitReordering();
		}
	}

	// =================================================================================
	// Edit Row
	$scope.editRow = function(row,isNotCancellable,dontFocus,callback){

		//---
		if($scope.settings.onEdit(row) === false){
			return;
		}


		if($scope.settings.showLoaderOnEdit && $window.innerWidth > $scope.settings.mobileBreakpoint){
			$scope.settings.tableDimmer.show();
			setTimeout(function(){
				$scope.settings.tableDimmer.hide();
			})
		}


		if($window.innerWidth < $scope.settings.mobileBreakpoint && !$scope.formModalShown && $scope.tableType !== "definition"){
			$scope.formModalShown = true;
			angular.forEach($scope.schema,function(field){
				if(field.type == "table"){
					field.tableSettings.tableScrolling = true;
				}
			})
			console.log("yooooo")
			$timeout(function(){
				$scope.editRow(row);
			},250) // TODO enhance

			return;
		}

		

		// --------------
		// Start editing
		// (definition can edit multiple rows at a time)
		if($scope.isAnyRowEditing && $scope.tableType !== "definition" && !row.isFormEdit){
			return;
		}
		row.isEditing = true;

		// --------------
		// Manipulation for definition table
		if($scope.tableType == "definition"){
			var _schema = [$scope.getDefinitionSchema(row)];
		}else{
			var _schema = $scope.schema;
		}

		// --------------
		// SetUp editingValue
		row.editingValues = {};
		angular.forEach(_schema,function(field){
			if(field.type == "table"){
				innerData = row[field.name] || [];
				innerSchema = field.tableSettings.schema;
				angular.forEach(innerData, function(innerRow,innerIndex){
					field.tableSettings.data[innerIndex] = {};
					field.tableSettings.data[innerIndex].editingValues = {};
					angular.forEach(innerSchema, function(innerField){
						field.tableSettings.data[innerIndex][innerField.name] = innerRow[innerField.name]
						field.tableSettings.data[innerIndex].editingValues[innerField.name] = innerRow[innerField.name]
						field.tableSettings.data[innerIndex].isValid = true; // TODO : check
					})
				})

				if(innerData.length == 0){
					field.tableSettings.data = [];
				}
			}
			row.editingValues[field.name] = angular.copy(row[field.name]);
		})

		// --------------
		// "A Changes B" functionality
		row.isNotCancellable = !!isNotCancellable;

		// --------------
		// Setup Errors and Watcher helper things
		angular.extend(row,{
			duplicateErrors: {},
			emptyErrors: {},
			minErrors: {},
			maxErrors: {},
			mobileErrors: {},
			emailErrors: {},
			dateErrors: {},
			invalidValuesErrors: {},
			invalidValuesErrorReasons: {},
			customErrors: {},
			customErrorReasons: {},
			patternErrors: {},
			embeddedTableErrors: {},
			hasError: {},
			errorMsg: {},
			isFocused: {},
			isDirty: row.isDirty || {},
			previousValues: {}
		})

		// --------------
		// helper for duplicateErros
		var allValues = {};
		var	setUpAllValues = function(){
			angular.forEach($scope.schema,function(field){
				if(field.unique){
					allValues[field.name] = [];
					angular.forEach($scope.data,function(_row,i){
						if( $scope.data.indexOf(row) !== i ){
							allValues[field.name].push(_row[field.name])
						}
					})
				}
			})
		}
		setUpAllValues();

		// ==================================
		// Wacthers
		var watchers = {
			duplicateErrors:  function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.unique && allValues[fieldName].indexOf(editingFieldValue) > -1){
						row.duplicateErrors[fieldName] = true;
					}else{
						row.duplicateErrors[fieldName] = false;
					}
				})
			},
			emptyErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];


					if(
						_field.required &&
						_field.type !== "email" &&
						_field.type !== "select" &&
						_field.type !== "number" &&
						_field.type !== "date" &&
						!editingFieldValue
					){
						row.emptyErrors[fieldName] = true;
					}else{
						row.emptyErrors[fieldName] = false;
					}

					if(_field.type == "email"){
						// In AngularJS,
						// if email is invalid ngModel is set to undefined
						// so it's not empty that's why ===
						if(_field.required && editingFieldValue === ""){
							row.emptyErrors[fieldName] = true;		
						}else{
							row.emptyErrors[fieldName] = false;
						}
					}

					if(_field.type == "select"){
						// In AngularJS,
						// 0 can also be an not empty value so using ===
						if(
							_field.required &&
							(editingFieldValue === "" ||
							editingFieldValue === undefined ||
							editingFieldValue === null)
						){
							row.emptyErrors[fieldName] = true;		
						}else{
							row.emptyErrors[fieldName] = false;
						}
					}

					if(_field.type == "number"){
						// In AngularJS,
						// if input is empty ngModel is set to null
						// 0 can also be an not empty value so using ===
						if(_field.required && editingFieldValue === null){
							row.emptyErrors[fieldName] = true;
						}else{
							row.emptyErrors[fieldName] = false;
						}
					}

					if(_field.type == "date"){
						// jQuery sets null if input.value is ""
						// "" becuase the value initially can be "" before jQuery sets it
						if(
							_field.required &&
							editingFieldValue === null ||
							editingFieldValue === ""
						){
							row.emptyErrors[fieldName] = true;		
						}else{
							row.emptyErrors[fieldName] = false;
						}
					}
				})
			},
			minErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];
					if(_field.min){
						if(_field.type == "number" && !(_field.min <= editingFieldValue) ){
							row.minErrors[fieldName] = true;
						}else{
							row.minErrors[fieldName] = false;
						}
					}
				})
			},
			maxErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];
					if(_field.max){
						if(_field.type == "number" && !(editingFieldValue <= _field.max) ){
							row.maxErrors[fieldName] = true;
						}else{
							row.maxErrors[fieldName] = false;
						}	
					}
				})
			},
			mobileErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.type == "mobile" && !(/^\d{10}$/.test(editingFieldValue)) && editingFieldValue !== null ){
						row.mobileErrors[fieldName] = true;
					}else{
						row.mobileErrors[fieldName] = false;
					}
				})
			},
			emailErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					// In AngularJS,
					// if email is invalid ngModel is set to undefined
					if(_field.type == "email" && editingFieldValue === undefined ){
						row.emailErrors[fieldName] = true;
					}else{
						row.emailErrors[fieldName] = false;
					}
				})
			},
			dateErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.type == "date" && editingFieldValue === undefined){
						row.dateErrors[fieldName] = true;
					}else{
						row.dateErrors[fieldName] = false;
					}
				})
			},
			invalidValuesErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.invalidValues && _field.invalidValues.length > 0){
						var _break = false;
						angular.forEach(_field.invalidValues,function(_item){
							if(!_break){
								if(editingFieldValue == _item.value){
									row.invalidValuesErrors[_field.name] = true;
									row.invalidValuesErrorReasons[_field.name] = _item.reason;
									_break = true;
								}else{
									row.invalidValuesErrors[_field.name] = false;
									row.invalidValuesErrorReasons[_field.name] = "";
								}
							}
						})	
					}else{
						row.invalidValuesErrors[_field.name] = false;
						row.invalidValuesErrorReasons[_field.name] = "";
					}
				})
			},
			customErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName],
						previousFieldValue = row.previousValues[fieldName];

					if(_field.validator){
						var validatorData = _field.validator(editingFieldValue, row);
						row.customErrors[fieldName] = !validatorData.isValid;
						row.customErrorReasons[fieldName] = validatorData.reason;
					}
					if(_field.validatorAsync){
						if( !_field.isValidatorIndependant || previousFieldValue !== editingFieldValue){
							_field.validatorAsync(editingFieldValue, row, function(validatorData){
								row.customErrors[fieldName] = !validatorData.isValid;
								row.customErrorReasons[fieldName] = validatorData.reason;
							})
						}
						/*
						i => isIndependent?, c => hasChanged?, f => callFn?
						i _i  c  f
						1  0  0  0
						1  0  1  1
						0  1  0  1
						0  1  1  1
						*/
					}
				})	
			},
			patternErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.pattern && !(_field.pattern.test(editingFieldValue)) ){
						row.patternErrors[fieldName] = true;
					}else{
						row.patternErrors[fieldName] = false;
					}
				})
			},
			embeddedTableErrors: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];

					if(_field.type == "table" && !_field.tableSettings.isValid){
						row.embeddedTableErrors[fieldName] = true;
					}else{
						row.embeddedTableErrors[fieldName] = false;
					}
				})
			},
			hasError: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName];


					if(
						row.duplicateErrors[fieldName] ||
						row.emptyErrors[fieldName] ||
						row.mobileErrors[fieldName] || 
						row.minErrors[fieldName] || 
						row.maxErrors[fieldName] || 
						row.invalidValuesErrors[fieldName] ||
						row.customErrors[fieldName] ||
						row.emailErrors[fieldName] || 
						row.dateErrors[fieldName] ||
						row.invalidValuesErrors[fieldName] ||
						row.customErrors[fieldName] ||
						row.patternErrors[fieldName] ||
						row.embeddedTableErrors[fieldName]
					){
						row.hasError[fieldName] = true;
					}else{
						row.hasError[fieldName] = false;
					}
				})
			},
			isValid: function(){
				var _break = false;
				angular.forEach(row.hasError,function(field){
					if(!_break){
						if(field){
							row.isValid = false;
							_break = true;
						}else{
							row.isValid = true;
						}
					}
				})
			},
			errorMsg: function(){
				angular.forEach(_schema,function(field){
					if(row.emptyErrors[field.name]){
						row.errorMsg[field.name] = field.emptyErrorMsg || field.label + " is required. Please fill it out.";
					}else if(row.duplicateErrors[field.name]){
						row.errorMsg[field.name] = field.duplicateErrorMsg || field.label + " should be unique. Please change it.";
					}else if(row.mobileErrors[field.name]){
						row.errorMsg[field.name] = field.mobileErrorMsg || "This is not a valid mobile number. Please change it.";
					}else if(row.emailErrors[field.name]){
						row.errorMsg[field.name] = field.emailErrorMsg || "This is not a valid email address. Please change it.";
					}else if(row.dateErrors[field.name]){
						row.errorMsg[field.name] = field.dateErrorMsg || "This is not a acceptable date (See the datepicker for acceptable dates). Please change it.";
					}else if(row.minErrors[field.name]){
						row.errorMsg[field.name] = field.minErrorMsg || field.label + " should be atleast " + field.min;
					}else if(row.maxErrors[field.name]){
						row.errorMsg[field.name] = field.maxErrorMsg || field.label + " should be atmost " + field.max;
					}else if(row.invalidValuesErrors[field.name]){
						row.errorMsg[field.name] = field.invalidValuesErrorMsg || row.invalidValueErrorReasons[field.name];
					}else if(row.customErrors[field.name]){
						row.errorMsg[field.name] = field.customErrorMsg || row.customErrorReasons[field.name];
					}else{
						row.errorMsg[field.name] = "";
					}
				})											
			},
			hasChanged: function(){
				var _break = false;
				angular.forEach(_schema,function(_field){
					if(!_break){
						var fieldName = _field.name,
							editingFieldValue = row.editingValues[fieldName],
							originalFieldValue = row[fieldName];

						if( editingFieldValue !== originalFieldValue){
							row.hasChanged = true;
							_break = true;
						}else{
							row.hasChanged = false;
						}
					}
				})
			},
			triggerOnChange: function(){
				angular.forEach(_schema,function(_field){
					var fieldName = _field.name,
						editingFieldValue = row.editingValues[fieldName],
						previousFieldValue = row.previousValues[fieldName];

					if( editingFieldValue !== previousFieldValue){
						$scope.settings.onChange(_field,editingFieldValue,previousFieldValue,row);
						row.previousValues[fieldName] = row.editingValues[fieldName];
					}
				})
			}
		}
		var callAllWatchers = function(){
			angular.forEach(watchers,function(callWatcher,name){
				callWatcher();
			})
		}
		row._removeWatcher = $scope.$watch(function(){ return row },callAllWatchers,true)
		row.callAllWatchers = callAllWatchers;

		$scope.editingRow = row;

		callback = callback || angular.noop;
		callback();
	}

	$scope.formEdit = function(){
		$timeout(function(){
			angular.forEach($scope.data,function(row){
				var fieldName = $scope.getDefinitionSchema(row).name;
				row.isFormEdit = true;
				$scope.editRow(row,true);
				if($scope.data.indexOf(row) == 0 && $scope.settings.shouldFocus){
					row.isFocused[fieldName] = true;
				}else{
					row.isFocused[fieldName] = false;
				}
			})
		})
	}
	$scope.settings.trigger.formEdit = $scope.formEdit;
	if($scope.settings.isForm){
		$scope.formEdit();
	}
	
	if($scope.tableType == "definition"){
		$scope.settings.focusInput = function(columnName){
			$scope.getDefinitionRow(columnName).isFocused[columnName] = true;
		}	
	}else{
		$scope.settings.focusInput = function(rowIndex,columnName){
			$scope.data[rowIndex].isFocused[columnName] = true;
		}
	}

	// =================================================================================
	// Cancel Editing
	$scope.cancelEditing = function(row){
		if($scope.formModalShown){
			$scope.formModalShown = false;
		}
		row.isEditing = false;
		row._removeWatcher();
		$scope.settings.onCancel(row);
		if(row.isNew){
			$scope.data.splice($scope.data.indexOf(row),1);
			row.isNew = false;
		}
		$scope.editingRow = null;
		$scope.selectedRow = null;
		row.isSelected = false;
		angular.forEach($scope.schema,function(field){
			if(field.type == "table"){
				field.tableSettings.tableScrolling = false;
			}
		})
	}
	$scope.confirmCancelEditing = function(row,event){
		if(row.hasChanged && !$scope.settings.dontConfirmForCancelEditing){
			$happyConfirm({
				"text": 
					!row.isNew ?
						"Are you sure you want to cancel editing?"
					: "Are you sure you want to cancel adding a new " + $scope.settings.rowNomenclature,
				"target": event.target,
				yes:function(){
					row.hasPopup = false;
					$scope.cancelEditing(row);
					$scope.$digest(); // we are using $.fn.click not ngClick
				}
			})
			row.hasPopup = true;
		}else{
			$scope.cancelEditing(row);
		}
	}

	// =================================================================================
	// Commit Editing
	$scope.commitEditing = function(row){

		if(row.isValid){
			if($scope.formModalShown){
				$scope.formModalShown = false;
				angular.forEach($scope.schema,function(field){
					if(field.type == "table"){
						field.tableSettings.tableScrolling = false;
					}
				})
			}

			//===================================
			// Manipulation for definition table
			var _schema;
			if($scope.tableType == "definition"){
				_schema = [$scope.getDefinitionSchema(row)];
			}else{
				_schema = $scope.schema;
			}

			if(row.hasChanged){
				//===================================
				// "A changes B" functionality
				if($scope.tableType == "definition"){
					var __schema = _schema[0];
					if(__schema.changes){
						angular.forEach(__schema.changes,function(field){
							if(field.table === undefined){
								field = {
									"name": field,
									"table": "same"
								}
							}
							if(field.table == "same"){
								var _row = $scope.getDefinitionRow(field.name);
								!_row.isEditing && $scope.editRow(_row,true);
							}else{
								var _row = $scope.getDefinitionRow(field.name,field.table.data);
								!_row.isEditing && field.table.editRow(_row,true);
							}
						})
					}
				}

				//===================================
				// First edit : focus next input
				if($scope.tableType == "definition" && row.isFormEdit){
					nextRowIndex = $scope.data.indexOf(row) + 1;
					nextRow = $scope.data[nextRowIndex];
					if(nextRow){
						nextRow.isFocused[$scope.getDefinitionSchema(nextRow).name] = true;
					}
				}			

				var oldRow = {},
					newRow = {};

				angular.forEach(_schema,function(field){
					if(row[field.name] !== row.editingValues[field.name]){
								
						oldRow[field.name] = row[field.name]
						newRow[field.name] = row.editingValues[field.name]
						
						if($scope.tableType == "definition" && !row.isNew){
							// look at manipulation for what [0] means
							if(_schema[0].changes && _schema[0].changes.length > 0 || row.isNotCancellable){
								$scope.settings.onCommit(
									field,
									row.editingValues[field.name],
									row[field.name]
								)
								$scope.settings.waitingUpdates[field.name] = row.editingValues[field.name];
							}else{
								$scope.settings.onUpdate(
									field,
									row.editingValues[field.name],
									row[field.name]
								)
							}
						}
						row[field.name] = row.editingValues[field.name];
					}
					if(field.primary){
						oldRow[field.name] = row[field.name];
						newRow[field.name] = row[field.name];
					}
				});



				if(row.isNew){
					var _row = angular.copy(row);
					if($scope.settings.reorderable){
						_row.editingValues[$scope.settings.indexProp] = $scope.data.indexOf(row);
					}
					$scope.settings.onInsert(_row.editingValues);
				}

				if($scope.tableType !== "definition" && !row.isNew){
					$scope.settings.onUpdate(newRow, oldRow);
				}
			}

			row.isNew = false;
			row.isEditing = false;
			row.isFormEdit = false;
			row._removeWatcher();
			$scope.editingRow = null;
			$scope.selectedRow = null;
			row.isSelected = false;

			$timeout(function(){ // let isAnyRowEditing update
				// (IMP) TODO: universal isAnyRowEditing for A changes B between foriegn tables
				if(row.isNotCancellable && !$scope.isAnyRowEditing && $scope.tableType == "definition"){
					$scope.settings.onUpdateCollection($scope.settings.waitingUpdates)
				}
			})
		}
	}
	$scope.settings.trigger.commitEditing = $scope.commitEditing;

	$scope.confirmCommitEditing = function(row,event){
		/*if(row.isNew){
			angular.forEach($scope.schema,function(field){
				row.hideErrors[field.name] = false;
			})
		}*/
		angular.forEach($scope.schema,function(field){
			row.isDirty[field.name] = true;
		})
			

		if(event){
			if( $(event.target).closest(".editor").length > 0 ){
				event.target = $(event.target).closest(".editor");
			}
			$(event.target).focusout();
		}

		if(!row.isValid){
			var _break = false;
			angular.forEach(row.hasError,function(field,fieldName){
				if(!_break){
					if(field && !field.hidden){
						row.isFocused[fieldName] = true;
						_break = true;
					}
				}
			})
			return;
		}
		
		if(row.hasChanged){
			if(!row.isFormEdit && !$scope.settings.dontConfirmForCommitEditing){
				$happyConfirm({
					"text":
						!row.isNew ?
							"Are you sure you want to commit editing?"
						: "Are you sure you want to add this " + $scope.settings.rowNomenclature + "?",
					"target": event.target,
					yes:function(){
						$scope.commitEditing(row);
						row.hasPopup = false;
						$scope.$digest(); // we are using $.fn.click not ngClick
					}
				})
				row.hasPopup = true;
			}else{
				$scope.commitEditing(row);
			}
		}else{
			$scope.commitEditing(row);
		}
	}

	$scope.formSubmit = function(){
		var formData = {};
		var rowsInvalidTillNow = 0;
		var _break;
		angular.forEach($scope.data,function(row){
			if(!_break){
				if(row.isValid){
					if($scope.areAllRowsValid){
						$scope.commitEditing(row);
						if($scope.tableType == "definition"){
							formData[$scope.getDefinitionSchema(row,$scope.schema).name] = row[$scope.getDefinitionSchema(row,$scope.schema).name]	
						}
					}
				}else{
					_break = true;
					if($scope.tableType == "definition"){
						if($scope.data.indexOf(row) == 0){
							$scope.confirmCommitEditing(row);
						}
					}else{
						if(rowsInvalidTillNow == 0){
							$scope.confirmCommitEditing(row);	
						}
					}
					rowsInvalidTillNow++;
				}
			}
		})
		if($scope.areAllRowsValid){
			$scope.settings.onSubmit($scope.tableType == "definition" ? formData : $scope.data);
		}
	}
	$scope.settings.isForm && ($scope.settings.submit = $scope.formSubmit);
	$scope.settings.editRow = $scope.editRow;

	$scope.$on("$locationChangeStart", function(a,b){
		console.log(a,b);
		if(!$scope.editingRow) return;
		/*if(
			!$window.history.state ||
			($window.history.state.editingRowHashKey !== $scope.editingRow.$$hashKey)
		){
			$scope.cancelEditing($scope.editingRow);
			//$scope.$digest();
		}*/
	})

	// =================================================================================
	// Delete Row
	$scope.deleteRow = function(row){
		$scope.data.splice($scope.data.indexOf(row),1);
		$scope.settings.onDelete(row);
	}
	$scope.confirmDelete = function(row,event){
		if(!row.isUndeletable){
			$happyConfirm({
				"text": "Are you sure you want to delete this " + $scope.settings.rowNomenclature + "?",
				"target": event.target,
				yes:function(){
					$scope.deleteRow(row);
					row.hasPopup = false;
					$scope.$digest(); // we are using $.fn.click not ngClick
				}
			})
			row.hasPopup = true;
		}else{

		}
	}


	$scope.toggleRowSelection = function(row){
		if($window.innerWidth > $scope.settings.mobileBreakpoint) return;

		var isSelected = row.isSelected
		angular.forEach($scope.data,function(row){
			row.isSelected = false;
		})
		row.isSelected = !isSelected;
		if(row.isSelected){
			$scope.selectedRow = row;
		}else{
			$scope.selectedRow = null;
		}
	}

	//===================================
	// Undeletable Popup
	$scope.$watch(function(){
		return $scope.data
	},function(){
		angular.forEach($scope.data,function(row){
			if(row.isUndeletable){
				row.undeletablePopup = {
					"content": row.undeletableReason,
					"position": "bottom right",
					"inline": true,
					"observeChanges":false
				}
			}else{
				row.undeletablePopup = false;
			}
		});
	},true)


	
	$scope.$watch("data",function(){
		var _break;

		_break = false;
		if($scope.data && $scope.data.length){
			angular.forEach($scope.data,function(row){
				if(!_break){
					if(row.isEditing){
						$scope.isAnyRowEditing = true;
						_break = true;
					}else{
						$scope.isAnyRowEditing = false;
					}
				}
			})
		}else{
			$scope.isAnyRowEditing = false;
		}


		_break = false;
		angular.forEach($scope.data,function(row){
			if(!_break){
				if(row.isFormEdit){
					$scope.isAnyRowFirstEdit = true;
					_break = true;
				}else{
					$scope.isAnyRowFirstEdit = false;
				}
			}
		})


		_break = false;
		angular.forEach($scope.data,function(_row){
			if(!_break){
				if(!_row.isValid){
					$scope.areAllRowsValid = false;
					$scope.settings.isValid = false;
					_break = true;
				}else{
					$scope.areAllRowsValid = true;
					$scope.settings.isValid = true;
				}
			}
		})
		if($scope.data.length == 0){
			$scope.areAllRowsValid = true;
			$scope.settings.isValid = true;
		}
	},true)
	



})
.service("$happyPageDimmer",function(){
	$("body").dimmer({
		variation: "inverted",
		closable: false,
		duration: {
			show: 100,
			hide: 100
		}
	})
	return {
		show: function(){		
			$("body").dimmer("show")
		},
		hide: function(){
			$("body").dimmer("hide")	
		}
	}
})
.service("$happyTableDimmer",function(){
	return function(table){
		$dimmer = $('\
			<div class="ui inverted dimmer happy-loading-dimmer">\
				<div class="ui large loader"></div>\
			</div>');

		$dimmer.appendTo(table);
		$dimmer.dimmer({
			duration: {
				show: 0,
				hide: 0
			}
		})

		return {
			show: $.fn.dimmer.bind($dimmer,"show"),
			hide: $.fn.dimmer.bind($dimmer,"hide")
		}
	}
})
.service("$happyConfirm",function($happyPageDimmer){
	return function(options){
		var _options = angular.copy(options);
		delete _options.text;
		delete _options.target;
		delete _options.yes;
		delete _options.no;
		
		// If yes,no are not set
		options = angular.extend({
			yes: angular.noop,
			no: angular.noop
		},options)
 
		// Target
		var $target = $(options.target);

		var popupOptions = angular.extend({
			"html":
				  '<div class="header">' + options.text + '</div><br>'
				+ '<div style="float:right">'  
					+ '<button class="ui small compact basic button no">No</button>'
					+ '<button class="ui small compact primary button yes">Yes</button>'
				+ '</div>',
			"target": $target,
			"position": "bottom right",
			"inline": false, // 21-01-2018 changed from true to false IMP!!
			"variation": "basic",
			"on": "",
			"lastResort": "bottom right"
		},_options)

		// Setup Popup
		$target.popup(popupOptions);

		// Show Popup
		$target.popup("show");

		// Show Dimmer
		$happyPageDimmer.show();

		// Focus on No
		$target.popup("get popup").find(".no").focus();

		// Make sure its left aligned
		$target.popup("get popup").css("text-align","left");

		// Actions		
		var $popup = $target.popup("get popup"),
			reset = function(callback){
				$target.popup("hide");
				$happyPageDimmer.hide();
				setTimeout(function(){
					if(popupOptions.inline){
						$target.popup("get popup").remove();
					}
					callback();
				},300) // for hide animation .3s
			}

		$popup.find(".yes").click(function(event){
			event.stopPropagation();
			event.stopImmediatePropagation();
			reset(options.yes);
		})
		$popup.find(".no").click(function(event){
			event.stopPropagation();
			event.stopImmediatePropagation();
			reset(options.no);
		})
	}
})
.directive("happyErrorMsg",function(){
	return function(scope,elem,attrs){
		scope.$watch(attrs.happyErrorMsg,function(msg,oldMsg){
			setTimeout(function(){
				if(msg){

					$(elem).popup("hide");
					$(elem).popup("destroy");

					var position = "bottom left";
					if(attrs.uiDate){
						position = "top left";
					}
					$(elem).popup({
						"content": msg,
						"inline": true,
						"on":"",
						"position": position
					});

					$(elem).on("focus",function(){
						if(msg){
							$(elem).popup("show");
						}
					})
					$(elem).on("blur",function(){
						if(msg){
							$(elem).popup("hide");	
						}
					})
					if($(elem).is(":focus")){
						$(elem).popup("show");
					}
				}else{
					$(elem).popup("hide");
					$(elem).popup("destroy");
					if( !!$(elem).next(".popup")){	
						$(elem).siblings(".popup").remove();
					}
				}
			})
		})
	}
})
.directive("happyPopup",function($timeout){
	return function(scope,elem,attrs){
		scope.$watch(attrs.happyPopup,function(options){
			if(options){
				if(typeof options == "string"){
					options = {
						"content": options,
						"position": "bottom right",
						"inline": true,
						"observeChanges":false,
						"lastResort": true
					}
				}
				$(elem).popup(options);	
			}else{
				$(elem).popup("hide");
				$(elem).popup("destroy");
			}
		})
	}
})
.directive("happySelect",function($timeout){
	return {
		scope:{
			"options": "=",
			"searchFilter": "=",
			"isTableScrolling": "="
		},
		require:"ngModel",
		template: 
		'<i class="dropdown icon"></i>\
		<div class="default text">Select ...</div>',
		link: function($scope,elem,$attrs,ngModel){

			// ----
			var $dropdown = $(elem);
			$dropdown.addClass("ui compact selection dropdown ");

			// ----
			function suifyOptions(options){
				var suiOptions = [];
				angular.forEach(options,function(option){
					suiOptions.push({
						"value": option.value,
						"name": option.label,
						"disabled": option.disabled
					})
				})
				return suiOptions;
			}

			// ----
			function getOptions(){
				return $scope[($scope.selectType == "fn" ? "_" : "") + "options"]
			}

			// ----
			function getValue(index){
				return getOptions()[index].value;
			}

			// ----
			function getIndex(value){
				var options = getOptions();
				for (var i = 0; i < options.length; i++) {
					if( angular.equals(options[i].value,value) ){
						return i;
					}
				}
			}			

			// ----
			var watcherRemoved = false;
			function setDropdownPos(){

				if(!$(elem).is(":visible")){
					if(!watcherRemoved){
						removeWatcher();
						watcherRemoved = true
					}
					return;
				}

				if(!$scope.isTableScrolling){
					return
				}

				var $rParent;
				var $dropdown = $(elem);
				var $menu = $(elem).find(".menu");
				var $icon = $dropdown.find(".dropdown.icon");
				var $searchInput = $(elem).find("input.search")
				var $table = $dropdown.closest(".happy-table");
				var $parent = $menu.parent();
				while( !$parent.is("html") && !$rParent){
					if(
						$parent.css("position") !== "static" ||
						$parent.css("transform") !== "none"
					){
						$rParent = $parent;
					}
					$parent = $parent.parent()
				}
				$rParent = $rParent || $("body");

				
				
				$menu.css({
					"left": $dropdown.offset().left - $rParent.offset().left + 2,
					"width": "auto",
					"min-width": $dropdown.outerWidth()
				})
				setTimeout(function(){
					if(!$dropdown.hasClass("upward")){
						$menu.css({
							"top": $dropdown.offset().top - $rParent.offset().top + $dropdown.outerHeight() - 2,
							"bottom": "auto"
						})
					}else{
						$menu.css({
							"bottom": $rParent.outerHeight() - ($dropdown.offset().top - $rParent.offset().top) - 2,
							"top": "auto"
						})
					}
				})
				$table.on("scroll",function(){
					$dropdown.dropdown("hide");
				})

	
				$icon.css({
					"top": "calc(" + ($dropdown.offset().top - $rParent.offset().top + 2) +"px + .78571429em)",
					"left": "calc(" + ($dropdown.offset().left - $rParent.offset().left + $dropdown.outerWidth() + 2) +"px - 2em)",
					"right": "auto"
				})

				// *cringes :(*
				if(
					$icon.offset().left + $icon.outerWidth() - Number($icon.css("padding-right").slice(0,-2))
					> $table.offset().left + $table.outerWidth()
				){
					if( $icon.is(":visible") ){
						$icon.hide();	
					}
				}else{
					$icon.show();
				}

				$searchInput.css({
					"top": $dropdown.offset().top - $rParent.offset().top + 2,
					"left": $dropdown.offset().left - $rParent.offset().left + 2,
					"width": $dropdown.outerWidth()
				})

			}

			// ----
			function setUpDropdown(){
				$scope.selectType = 
					(typeof $scope.options == "function") ?
						"fn" :
					"basic";

				$dropdown.addClass(
					$scope.searchFilter || $scope.selectType == "fn" ?
						"search" :
					undefined
				)

				$dropdown.dropdown({
					showOnFocus:
						false,

					selectOnKeydown:
						false,

					apiSettings:
						$scope.selectType == "fn" ? {
							responseAsync: function(settings,callback){
								if(!!settings.urlData.query){
									$scope.options(settings.urlData.query,function(options){
										var callbackResponse = {
											"success": true,
											"results": []
										}
										angular.forEach(options,function(option){
											callbackResponse.results.push({
												"value": option.value,
												"name": option.label,
												"disabled": option.disabled
											})
										})
										$scope._options = options;
										callback(callbackResponse);
									})
								}
							}
						} : false,

					values : 
						$scope.selectType !== "fn" ? suifyOptions($scope.options) : undefined,

					onChange:
						function(value,text,$option){
							if($option){ //27-01-2018
								ngModel.$setViewValue(getValue($option.index()));
								ngModel.$dirty = true;
								ngModel.$render();
							}
							setDropdownPos();
						},

					onShow:
						function(){
							$(elem).popup("hide");
							if($scope.isTableScrolling){
								setDropdownPos();
							}
						}

				})
			}
			$scope.$watch("options",setUpDropdown,true)
			$scope.$watch("searchFilter",setUpDropdown)
			var removeWatcher = angular.noop;
			if($scope.isTableScrolling){
				removeWatcher = $scope.$watch(function(){ return $scope.$parent.data },function(){
					setTimeout(setDropdownPos);
				},true)
				$("*").on("scroll",setDropdownPos)
				$(window).resize(setDropdownPos)
			}

			
			// To enable functionality even with dropdown is close
			// just like native select
			/*$dropdown.on("keydown",function(event){
				if( !$dropdown.hasClass("active") ){
					event.stopImmediatePropagation();
					if(event.keyCode == 13){
						$(this).click();
					}else if(event.keyCode == 40){ //downKey
						if($(this).find(".item.selected")[0]){
							if( !$(this).find(".item.selected").is(":last-child") ){
								$(this).find(".item.selected").next().click()
							}else{
								$(this).find(".item").first().click()
							}
						}else{
							$(this).find(".item").first().click()
						}
					}else if(event.keyCode == 38){ //upKey
						if($(this).find(".item.selected")[0]){
							if( !$(this).find(".item.selected").is(":first-child") ){
								$(this).find(".item.selected").prev().click()
							}else{
								$(this).find(".item").last().click()
							}
						}else{
							$(this).find(".item").last().click()
						}
					}else if(65 <= event.keyCode && event.keyCode <= 90){
						$(this).find("input.search").focus();	
					}
				}
			})*/

			$dropdown.on("click",function(event){
				event.stopPropagation();
			})

			function updateViewValue(a,b){
				var value = ngModel.$modelValue;
				if($scope.selectType == "fn"){
					ngModel.$setViewValue(value);
					ngModel.$render();
				}else{
					$dropdown.find(".item:not(.disabled)").each(function(){
						if( getIndex(value) == $(this).index() ){
							$(this).click();
						}
					})
					
					if(value === undefined || value === ""){
						$dropdown.css("min-width","12em");
					}else{
						$dropdown.css("min-width","");
					}
				}
			}

			// Two way data binding
			$scope.$watch(function(){return ngModel.$modelValue},updateViewValue)
			$scope.$watch("options",updateViewValue,true)
		}
	}
})
.directive("tableScrollingWatcher",function($timeout,$window){
	return function(scope,elem,attrs){
		function getW($el){ return $el[0] && $el[0].getBoundingClientRect().width}
		function getH($el){ return $el[0] && $el[0].getBoundingClientRect().height}	
		function getX($el){ return $el[0] && $el[0].getBoundingClientRect().x}	
		function getY($el){ return $el[0] && $el[0].getBoundingClientRect().y}	

		function setPos(){
			if(!scope.happySortable.disabled) return;
			
			var $htDir = $(elem).closest("[happy-table]");
			var rightMost = $window.innerWidth - getX($htDir) - getW($htDir);
			var nearest = function(){
				return $(this).closest("[happy-table]").is($htDir);
			}
			var $menu = $htDir.find(".ui.top.menu").filter(nearest);

			$htDir
			.find("th:last-child, td:last-child, td:nth-last-child(2)")
			.filter(nearest)
			.each(function(){
				var $tr = $(this).closest("tr");
				$(this).css({
					"height": getH($tr),
					"top": getY($tr),
				})
			})

			$htDir
			.find("th:last-child, td:last-child")
			.filter(nearest)
			.each(function(){
				$(this).css({
					"right": rightMost
				})
			})

			$htDir
			.find("td:nth-last-child(2)")
			.filter(nearest)
			.each(function(){
				var $tr = $(this).closest("tr");
				$(this).css({
					"right": rightMost + getW($(this).next())
				})
			})
		}

		scope.$watch(function(){
			return [scope.data,scope.happySortable.disabled]
		},function(){
			if(scope.settings.tableScrolling && $window.innerWidth > scope.settings.mobileBreakpoint){
				$timeout(setPos);
			}
		},true)

		$(window).resize(function(){
			if(scope.settings.tableScrolling && $window.innerWidth > scope.settings.mobileBreakpoint){
				setPos();
			}
		})

		$("*").scroll(function(){
			if(scope.settings.tableScrolling && $window.innerWidth > scope.settings.mobileBreakpoint){
				setPos();
			}
		})
	}
})
.directive("selectedRowToggler",function(){
	return function(scope,elem,attrs){
		$(elem).parent("[happy-table]").on("click",function(event){
			console.log("booo")
			event.stopPropagation();
		})
		$("body").click(function(){
			if(!scope.selectedRow) return;
			scope.selectedRow.isSelected = false;
			scope.selectedRow = null;
			scope.$digest();
		})
	}
})
// ==========================
// Helper Directives
.directive("onEnterKeyup",function($parse){
	return function(scope,elem,attrs){
		$(elem).on("keyup",function(event){
			if(event.keyCode == 13){
				scope.$apply(function(){
					$parse(attrs["onEnterKeyup"])(scope,{"$event": event})	
				})
			}
        })
	}
})
.directive("onDirty",function($timeout){
	return {
		require: "ngModel",
		link: function(scope,elem,attrs,ngModel){
			scope.$watch(function(){
				return ngModel.$dirty;
			},function(isDirty){
				if(isDirty){
					$timeout(function(){
						scope.$apply(attrs.onDirty);
					},0,false)
				}
			})
		}
	}
})
.directive("onTouched",function($timeout){
	return {
		require: "ngModel",
		link: function(scope,elem,attrs,ngModel){
			scope.$watch(function(){
				return ngModel.$touched;
			},function(isTouched){
				if(isTouched){
					$timeout(function(){
						scope.$apply(attrs.onTouched);
					},0,false)
				}
			})
		}
	}
})
.directive("isFocused",function($timeout){
	return function(scope,elem,attrs){
		scope.$watch(attrs.isFocused,function(isFocused){
			$timeout(function(){
				if(isFocused){
					$(elem).focus();
					if($(elem).attr("happy-table") === ""){ // not undefined
						scope.$apply(attrs.ngFocus);
					}
				}
			},0,false)
		})
	}
})
.directive("selectAll",function(){
	return function(scope,elem,attrs){
		scope.$watch(attrs.selectAll,function(selectAll){
			if( selectAll ){
				$(elem).select();
			}
		})
	}
})
.directive("fitTextInput",function(){
	var $fakeSpan = $("<span/>").hide().appendTo("body")
	return function(scope,elem,attrs){
		scope.$watch(attrs.fitTextInput,function(fitTextInput){
			$(elem).on("input",function(){
				if(fitTextInput){
					$fakeSpan
					.text($(this).val() || $(this).attr("placeholder"))
					.css("font",$(this).css("font"))
					.css("padding",$(this).css("padding"))
					.css("border",$(this).css("border"));

					$(this).css("width",$fakeSpan.outerWidth() + 50)
				}
			}).trigger("input")
		})
	}
})

// =================================================================================
// Datepicker Options

var stylizeDatepicker = function(inst){
	$datepicker = inst.dpDiv;

	$datepicker.find("table")
	.addClass("ui compact celled seven column center aligned unstackable attached top table");

	$datepicker.find(".ui-datepicker-next .ui-icon").remove();
	$datepicker.find(".ui-datepicker-next").append($("<i></i>").addClass("ui icon chevron right"));

	$datepicker.find(".ui-datepicker-prev .ui-icon").remove();
	$datepicker.find(".ui-datepicker-prev").append($("<i></i>").addClass("ui icon chevron left"));
}
$.datepicker.setDefaults({
	dayNamesMin: ["S","M","T","W","T","F","S"],
	prevText: "",
	nextText: "",
	dateFormat:"dd-mm-yy",
	afterShow : function(inst){
		
		stylizeDatepicker(inst);
		
		// for fixing buggy postion
		if(!inst.shownOnce){
			inst.input.datepicker("option","afterShow",function(){});
			setTimeout(function(){
				inst.input.datepicker("hide");
				if(inst.input.is(":focus")){
					inst.input.focus();	
				}
			})
			inst.input.datepicker("option","afterShow",stylizeDatepicker);
			inst.shownOnce = true;
		}
		function _debounce(func, wait, immediate){
			var timeout;
			return function() {
				var context = this, args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};
				var callNow = immediate && !timeout;
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
				if (callNow) func.apply(context, args);
			};
		}
		$(window).resize(_debounce(function(){
			if(inst.input.datepicker("widget").css("display") !== "none"){
				inst.input.datepicker("hide");
				inst.input.focus();
			}
		},250));
		// TODO : update validity after manually inputing the date

	}
})


$.datepicker._updateDatepicker_original = $.datepicker._updateDatepicker;
$.datepicker._updateDatepicker = function(inst) {
    $.datepicker._updateDatepicker_original(inst);
    var afterShow = this._get(inst, "afterShow");
    if (afterShow){
        afterShow(inst);
    }
}