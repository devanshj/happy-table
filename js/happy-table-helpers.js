
window.HappySchemaHelper = function(table){
	return {
		get: function(fieldName){
			var schema = table.schema;
			for (var i = 0; i < schema.length; i++) {
				if(schema[i].name == fieldName){
					return schema[i];
				}
			};
		}
	}
}

window.HappyDefinitionDataHelper = function(table){
	return {
		get: function(fieldName){
			return this.getRow(fieldName)[fieldName];
		},
		_get: function(fieldName){
			return this.getRow(fieldName).editingValues[fieldName];
		},
		getRow: function(fieldName){
			var data = table.data;
			for (var i = 0; i < data.length; i++) {
				if(Object.keys(data[i]).indexOf(fieldName) > -1){
					return data[i];
				}
			}
		},
		_set: function(arg1,newVal){
			this.set(arg1,newVal,true)
		},
		set: function(arg1,newVal,inEdit){
			var data = table.data;
			if(typeof arg1 == "string"){
				fieldName = arg1;
				for (var i = 0; i < data.length; i++) {
					if(Object.keys(data[i]).indexOf(fieldName) > -1){

						if(!inEdit){
							return data[i][fieldName] = newVal;
						}else{
							return data[i].editingValues[fieldName] = newVal;
						}
					}
				}
			}else{
				var that = this, changes = arg1;
				angular.forEach(changes,function(newVal,fieldName){
					that.set(fieldName,newVal,inEdit);
				})
			}
		},
		setAll: function(newObj){
			var props = Object.keys(newObj);
			for (var i = 0; i < props.length; i++) {
				this.set(props[i],newObj[props[i]])
			}
		}
	}
}
