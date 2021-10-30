Vue.component('datatable',{
  template:"#datatable",
  props: ['items'],
  data: function() {
    return {
      searchKey: '',
      sortBy: 'name',
      sortOrder: 'asc'
    }
  },
  computed: {    
    orderedList() {
      var list = this.items.filter(
           function(item){
              var filtlist = item.name.toLowerCase().indexOf(this.searchKey.toLowerCase()) > -1 ||
              item.prename.toLowerCase().indexOf(this.searchKey.toLowerCase()) > -1 ||
              item.age.toLowerCase() == this.searchKey.toLowerCase();      
              return filtlist;
          }.bind(this)); 
          return _.orderBy(list, this.sortBy, this.sortOrder);
    },
    toggleSortOrder: function(){
      if (this.sortOrder == 'asc') {
         return 'desc'
      }
      return 'asc'
    }
  },
  methods: {
    columnSort:function(sortBy, sortOrder, item) {
        var elem = document.getElementById(item);
      
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        
        var elems = document.querySelectorAll("th");
        [].forEach.call(elems, function(el) {
            el.classList.remove("descending");
            el.classList.remove("ascending");
        }); 
        if (this.sortOrder == 'desc') {
           elem.className = 'descending';
        } else {
           elem.className = 'ascending';
        }
    }
   },
})

var app = new Vue({
  el: "#wrapper",
  data: {
    items:[
          { name: 'Dumbledore', prename: 'Albus', age: '98' },
          { name: 'Potter', prename: 'Harry', age: '38' },
          { name: 'Granger', prename: 'Hermine', age: '34' },
          { name: 'Wesley', prename: 'Ron', age: '36' },
          { name: 'Strebel', prename: 'Nicole', age: '28' },
          { name: 'Strebel', prename: 'Susan', age: '26' },
          { name: 'Strebel', prename: 'Silvia', age: '51' },
          { name: 'Strebel', prename: 'René', age: '58' },
          { name: 'Doe', prename: 'John', age: '34' },
          { name: 'Foe', prename: 'Jane', age: '20' },
		  { name: 'Fasdwe', prename: 'Gewqwe', age: '547' },
		  { name: 'dfsdgwewe', prename: 'Fewerwer45234', age: '4' },
		  { name: 'Feweqefwqwe', prename: 'Jane', age: '150' }
        ]  
    }
});