(function() {

    window.countries=[];
    window.clickedIndicator = false;
    window.expandedCategory = false;

    var hashParams = window.utils.getHashParams();
    var yearsExtremes = []; //default, will be calculated
    var yearsExtremesForData = [];
    // var indicatorsMeta;

    var activeData;
    var regionalAverageData, regionalAverageSeries;
    var regionalAverageIndex;
    //var groupBy = "countries";
    //var groupByRegion = false;
    var modalTitle = "";
    var modalMessage = "";
    var geometryType = "sovereignt";

    var yearsFilter = hashParams.f.split("|");
    var indicators = hashParams.i.split("|");
    //var group = hashParams.g;
    //var region = hashParams.r;
    var chartType = hashParams.c;
    var regions = hashParams.r.split("|");
    var cluster = {};
    //groupByRegion = parseInt(hashParams.grp);

    var statsData, statsDataSeries;

    $('#modal').modal({
        show: false,
        keyboard: false
    }); // initialized with defaults


    $('#modal').on('show.bs.modal', function(event) {
        var modal = $(this)
        modal.find('.modal-title').text(modalTitle);
        modal.find('.modal-body').text(modalMessage);
    });

    $('#opener').on('click', function() {
        var panel = $('#slide-panel');
        if (panel.hasClass("visible")) {
            panel.removeClass('visible').animate({
                'margin-left': '-600px'
            });
        } else {
            panel.addClass('visible').animate({
                'margin-left': '0px'
            });
        }
        return false;
    });

    var model = {

        shareUrl: function() {

            modalTitle = "Share";
            modalMessage = "";
            //go.usa.gov
            //
            var encodeUrl = "http://find.state.gov";


            if (window.location.hostname === "find.state.gov") {
                encodeUrl = window.location.href;
            }

            encodeUrl = encodeURIComponent(encodeUrl);

            var url = "https://go.usa.gov/api/shorten.jsonp?login=find&apiKey=513b798e10d6c101ac6ac7fdd405d0e7&longUrl={encodeUrl}";
            url = url.replace("{encodeUrl}", encodeUrl);

            window.loader.loadUrlShorten(url).then(function(response) {
                modalTitle = "Share";
                modalMessage = response.response.data.entry[0].short_url;
                $('#modal').modal('show');
            });



        },

        shareFacebook: function() {

            debugger;

        },

        shareTwitter: function() {

            debugger;

        },

        saveVZ: function() {

            window.popupDVSave();

        },
        chartBarToggleMin: function() {
            var key = "min";
            var labelKey = "Global Minimum";
            var arrayBefore = [];

            var action = this.barUpdateCategories(key, labelKey, arrayBefore);
            this.barUpdateData(key, action, arrayBefore);
        },

        chartBarToggleMax: function() {
            var key = "max";
            var labelKey = "Global Maximum";
            var arrayBefore = ['Global Minimum'];

            var action = this.barUpdateCategories(key, labelKey, arrayBefore);
            this.barUpdateData(key, action, arrayBefore);
        },

        chartBarToggleAvg: function() {
            var key = "avg"
            var labelKey = "Global Average";
            var arrayBefore = ['Global Minimum', 'Global Maximum'];

            var action = this.barUpdateCategories(key, labelKey, arrayBefore);
            this.barUpdateData(key, action, arrayBefore);
        },

        barFindIndex: function(key, searchArray) {
            var useIndex = 0;

            var chart = $('#viz-container').highcharts();

            var categories = chart.xAxis[0].names;

            if (key == 'min') {
                useIndex = 0;
            } else if (key == 'max') {
                if ($.inArray("Global Minimum", categories) > -1) {
                    useIndex = 1;
                }
            } else if (key == 'avg') {
                if ($.inArray("Global Minimum", categories) > -1) {
                    useIndex++;
                }
                if ($.inArray("Global Maximum", categories) > -1) {
                    useIndex++;
                }
            }

            return useIndex;
        },

        barUpdateData: function(key, action, searchArray) {
            var no = this.barFindIndex(key, searchArray);
            var chart = $('#viz-container').highcharts();
            var newY = $("#data-proxy").data(key);
            var data = [];

            for (i = 0; i < chart.series[0].data.length; i++) {
                data.push(chart.series[0].data[i].y);
            }

            if (action == "add") {
                data.splice(no, 0, newY);
            } else if (action == "remove") {
                data.splice(no, 1);
            }

            chart.series[0].setData(data);
        },

        barUpdateCategories: function(key, labelKey, searchArray) {
            var foundIndex = this.barFindIndex(key, searchArray);
            var chart = $('#viz-container').highcharts();
            var categories = chart.xAxis[0].names;
            var action = "none";
            //check if key is in category label

            if ($.inArray(labelKey, chart.xAxis[0].names) > -1) {
                //present, remove it
                action = "remove";
                categories.splice(foundIndex, 1);
            } else {
                //absent, add it back
                action = "add";
                categories.splice(foundIndex, 0, labelKey);
            }

            chart.xAxis[0].setCategories(categories, false);
            return action;
        },

        showRegionalAverage: function() {

        },

        showStats: function(type) {

            var index = 0;

            switch (type) {
                case "min":
                    index = 0;
                    break;

                case "max":
                    index = 1;
                    break;

                case "avg":
                    index = 2;
                    break;
            }

            var activeChart = $('#viz-container').highcharts();
            var series = activeChart.series[index];

            if (series.visible) {
                series.hide();
                //$button.html('Show series');
            } else {
                series.show();
                // $button.html('Hide series');
            }
        },

        showAll: function() {

            var activeChart = $('#viz-container').highcharts();
            $(activeChart.series).each(function() {
                //this.hide();
                this.setVisible(true, false);
            });
            activeChart.redraw();

        },

        hideAll: function() {

            var activeChart = $('#viz-container').highcharts();
            $(activeChart.series).each(function() {
                //this.hide();
                this.setVisible(false, false);
            });
            activeChart.redraw();

        },

        selectYear: function() {
            var yearsArray = [];
            var pickedFromDropdown = false;
            if (!(years instanceof Array)) {
                yearsArray = [years];
                pickedFromDropdown = true;
            } else {
                yearsArray = years;
            }
            model.activeYears.removeAll();

            model.activeYears(yearsArray);
            debugger;
            if (pickedFromDropdown) {
                $("#filter-years").slider('values', 0, years);
                $("#filter-years").slider('values', 1, years);

            }
        },

        groupBy: function(type) {

            groupBy = type;

            //redrawChart(yearsFilter[0], yearsFilter[1]);

        },

        activeChart: ko.observable(chartType),

        activeIndicators: ko.observableArray([]),

        activeYears: ko.observableArray([1990, 2014]),

        categoriesModel: ko.observableArray([]),

        sourcesModel: ko.observableArray([]),

        indicatorsModel: ko.observableArray([]),

        indicatorsModelMaster: ko.observableArray([]),

        filterIndicators: function(m, evt) {

            var charCode = evt.charCode;
            var value = evt.currentTarget.value;

            var indicators = model.indicatorsModelMaster();
            model.indicatorsModel.removeAll();
            //model.newSearch(false);

            for (var x in indicators) {

                if (indicators[x].label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
                    model.indicatorsModel.push(indicators[x]);
                }
            }

            return true;

        },

        countriesModel: ko.observableArray([]),

        countriesModelMaster: ko.observableArray([]),

        countryGroupings: ko.observableArray([]),

        //countryGroupRegions: ko.observableArray([]),

        activeCountries: ko.observableArray([]),

        activeGroup: ko.observable({
            "id": "all",
            "label": "All",
            "regions": []
        }),

        groupByRegion: ko.observable(false),

        activeRegion: ko.observable(""),

        clearActiveCountries: function() {

            var mod = model.activeCountries();
            for(var i = 0; i  < mod.length; i++) {

                var abbr = mod[i].id.toLowerCase();
                var $this = $("."+abbr+"").parent();
                $this.removeClass("selected");

            }
            model.activeCountries.removeAll();

        },

        removeIndicator: function(selectedIndicator) {

            var indicatorIndex = _.indexOf(model.activeIndicators(), selectedIndicator);
            model.activeIndicators.splice(indicatorIndex, 1);

          //  window.utils.flipCardEvent();
        },

        selectSubcategory: function(selectedSubcategory, evt) {
            evt.stopPropagation();
            var currentTarget = evt.currentTarget;
            var displayValue = $(currentTarget).next().css("display");
            if (displayValue == "none") {
                $(currentTarget).next().css("display", "block");
            } else {
                $(currentTarget).next().css("display", "none");
            }

        },

        selectIndicatorMultiple: function(selectedIndicator, evt, direct) {

            clickedIndicator = true;
            model.activeIndicators.push(selectedIndicator);
            // TODO -- inprogress -- make sure flip sequence is working properly
            //window.utils.flipCardEvent();

        },

        selectCountry: function(selectedCountry, evt, goToVisualize, breakdown) {

            var isGroup = selectedCountry.geounit.indexOf(":all") == selectedCountry.geounit.length - 4;

            if (isGroup) { //breakdown a group
                selectedCountry.label += " Regions";
            }

            if (!isGroup && breakdown) { //breakdown a region
                selectedCountry.label += " Countries";
                selectedCountry.geounit += ":all";
            }

            if (goToVisualize) {
                //TODO: Calculate Year Extremes
                window.location.href = "data-visualization#f=1990|2014&i=gdp_per_capita&c=line&r=" + selectedCountry.geounit
                return;
            }

            var abbr = selectedCountry.id.toLowerCase();
            var $this = $("."+abbr+"").parent();

            // toggle the selection/deselection
            if ($this.hasClass("selected")) {
              $this.removeClass("selected");
              var selectedCountry = arguments[0];
              var activeCountries = model.activeCountries();
              var selectedIndex = _.indexOf(activeCountries, selectedCountry);

              var abbr = selectedCountry.id.toLowerCase();
              var $this = $("."+abbr+"").parent();
              $this.removeClass("selected");

              model.activeCountries.splice(selectedIndex, 1);
              // make sure selectetion is false
              selectedCountry.selected = false;

            } else {
              $this.addClass("selected");
              selectedCountry.selected = true;

              model.activeCountries.push(selectedCountry);
            }

        },

        clearActiveIndicators: function() {
            model.activeIndicators.removeAll();
        },

        selectCountryGroup: function() {

            var groupId = arguments[0].id;

            //window.changeGroup(groupId);

            model.activeGroup(arguments[0]);
            model.activeRegion(""); //set active region to undefined


            //model.countryGroupRegions.removeAll();


            if (groupId == "all") {
                model.selectCountryGroupRegion("all"); //just select all countries
            } else {
                //assign region to countryGroupRegion


                _.forEach(model.countryGroupings(), function(countryGroup) {
                    if (groupId == countryGroup.id) {
                        //model.countryGroupRegions(_.clone(countryGroup.regions, true));
                        model.selectCountryGroupRegion(countryGroup.regions[0]);
                    }
                })

            }



        },

        selectCountryGroupRegion: function() {
            var selectedRegion = arguments[0];
            var selectedGroup = model.activeGroup();

            model.activeRegion(selectedRegion);
            model.countriesModel.removeAll();

            var countriesModelMaster = _.clone(model.countriesModelMaster(), true);

            _.forEach(countriesModelMaster, function(country) {
                if (selectedRegion == "all") {
                    model.countriesModel.push(country);
                } else if (_.has(country.regions, selectedGroup.id) && country.regions[selectedGroup.id] == selectedRegion) {
                    model.countriesModel.push(country);
                }

            })

            //filter country view by region

        },

        filterCountries: function(m, evt) {

            var charCode = evt.charCode;
            var value = evt.currentTarget.value;

            var countries = model.countriesModelMaster();
            model.countriesModel.removeAll();
            //model.newSearch(false);

            for (var x in countries) {

                if (countries[x].label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
                    model.countriesModel.push(countries[x]);
                }
            }

            return true;

        },

        redrawChart: function(indicator) {

            $("#loading").show();

            if ($('#viz-container').highcharts()) {
                $('#viz-container').highcharts().destroy();
            };

            //indicators = [indicator.id];
            indicators = _.map(model.activeIndicators(), function(indicator) {
                return indicator.id;
            });

            var currentHash = window.utils.getHashParams();
            var indicatorsArr = currentHash.i.split("|");
            //var newIndicators = indicatorsArr.concat(geounits);
            currentHash.i = indicators[indicators.length - 1]; //USE ONLY ONE INDICATOR
            currentHash.i = indicators.join("|"); //USE ONLY ONE INDICATOR

            //debugger;
            window.utils.updateHash(currentHash);


            function _takeDataDrawChart() {


                var _deferredList = window.loader.loadIndicatorData(indicators, currentHash.r.split("|"), yearsExtremes);

                  $.when.apply($, _deferredList)
                  .done(function(response) {
                      indicatorDataLoadHandler(arguments);
                  })
                  .fail(function(response){
                      $("#loading").html('We\'re sorry! The server has encountered an error: Please <a style="color:#336b99;font-weight:600;" href="javascript:location.reload();">Click Here</a> to reload.');
                  });

            }

            _takeDataDrawChart();

            model.activeIndicators.removeAll();
        },

        addRegionComparator: function() {
            model.addComparator("group");
        },

        addComparator: function() {

            var geounits = _.map(model.activeCountries(), function(_a) {
                return _a.geounit;
            });
            //debugger;
            var currentHash = window.utils.getHashParams();
            var regionsArr = currentHash.r.split("|");
            var newRegions = regionsArr.concat(geounits);
            currentHash.r = newRegions.join("|");

            //debugger;
            window.utils.updateHash(currentHash);

            var _deferredList = window.loader.loadIndicatorData(indicators, newRegions, yearsExtremes);

            $.when.apply($, _deferredList)
            .done(function(response) {
                indicatorDataLoadHandler(arguments);
            })
            .fail(function(response){
                $("#loading").html('We\'re sorry! The server has encountered an error: Please <a style="color:#336b99;font-weight:600;" href="javascript:location.reload();">Click Here</a> to reload.');
            });

            model.activeCountries.removeAll();

        }
    }

    ko.applyBindings(model);

    var filterCountryList = function(countryName) {
          var $countryWrapper = $('.country-wrapper');
          //debugger;
          if(countryName.length == 0) { $countryWrapper.show(); }
          $countryWrapper.hide();
          $('.flags-labels:contains(' + countryName + ')').parents('.country-wrapper').show();
    };

    var initialize = function() {

        $.expr[":"].contains = $.expr.createPseudo(function(arg) {
            return function( elem ) {
                return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
            };
        });

        $('input[data-bind].btn-block').on('keyup', function(e) {

          filterCountryList(e.target.value);

        });
        //track hash update
        window.onhashchange = function(evt) {
            var newURL = evt.newURL;
            var _hashParams = window.utils.getHashParams();
            yearsFilter = _hashParams.f.split("|");
            if (chartType == "line") {
                setExtremes(yearsFilter[0], yearsFilter[1]);
            } else {
                updateChartData(yearsFilter);
            }

        }


    }

    var createYearSlider = function(minYear, maxYear) {

        var minYearFilter = parseInt(yearsFilter[0]);
        var maxYearFilter = parseInt(yearsFilter[1]);

        if (maxYearFilter > maxYear)
            maxYearFilter = maxYear;

        if (minYearFilter < minYear)
            minYearFilter = minYear;

        //debugger;
        var isRange = false;

        if (chartType == "line" || chartType == "scatter") {
            isRange = true;
        } else {
            minYearFilter = maxYearFilter;
        }

        if (minYearFilter != maxYearFilter) {
            yearLabel = minYearFilter + "-" + maxYearFilter;
        } else {
            yearLabel = maxYearFilter.toString();
        }

        $("#filter-years-label").html(yearLabel);

        var sliderOptions = {
            range: isRange,
            min: minYear,
            max: maxYear,

            change: function(event, ui) {

                var isRange = ui.values;
                //var series = $('#viz-container').highcharts().series

                var startYear = isRange ? ui.values[0] : ui.value;

                var endYear = isRange ? ui.values[1] : ui.value;

                var yearLabel = startYear;

                if (startYear != endYear) {
                    yearLabel = startYear + "-" + endYear;
                    // model.selectYear([startYear, endYear]);
                } else {
                    yearLabel = endYear;
                    // model.selectYear([startYear]);
                }

                $("#filter-years-label").html(yearLabel);

                //update hash
                var currentHash = window.utils.getHashParams();

                currentHash.f = startYear + "|" + endYear;

                window.utils.updateHash(currentHash);

                if (chartType == "map") {
                    console.time("choropleth");
                    addDataToGeoJson(window.loader.lastGeoJson, geometryType);

                    addChoroplethLayer(window.loader.lastGeoJson, geometryType, cluster, indicators[0]);
                }
                //redrawChart(startYear, endYear);
            },
            slide: function(event, ui) {
                //  debugger;

                //$("#filter-years-label")[0].innerHTML = ui.values[0] + " - " + ui.values[1];

            }
        }

        if (chartType == "line" || chartType == "scatter") {
            sliderOptions.values = [minYearFilter, maxYearFilter];
            sliderOptions.min = minYear;
            sliderOptions.max = maxYear;
        } else {
            sliderOptions.value = maxYearFilter;
        }


        $("#filter-years").slider(sliderOptions).slider("pips", {
            /* options go here as an object */
        }).slider("float", {
            /* options go here as an object */
        });
    }

    var saveFields = [];
    var saveData = [];

    var showTable = function(data) {
        //debugger;
        //get colum names from cells

        var columnsSortable = [];
        var cells = data.cells;

        _.forEach(cells, function(cell, i) {
            cell.id = i
        });

        function DummyLinkFormatter(row, cell, value, columnDef, dataContext) {
            //return '<a href="#">' + value + '</a>';
            return value
        }

        for (var colName in cells[0]) {
            // columnTitles.push(colName);
            columnsSortable.push({
                id: colName,
                name: colName,
                field: colName,
                width: 200,
                sortable: true,
                formatter: DummyLinkFormatter
            });
        }


        var columns;
        var data;

        // Example 3: sortable, reorderable columns
        columns = columnsSortable.slice();
        data = cells.slice();

        // Reformat columns array for wide data grid
        columns = [{
            "id": "indicator",
            "name": "indicator",
            "field": "indicator",
            "sortable": "true"
        }, {
            "id": "country",
            "name": "country",
            "field": "country",
            "sortable": "true"
        }];


        //Get years and append to columns
        data.forEach(function(entry) {

            var yearExists = 0;
            columns.forEach(function(column) {
                if (entry['year'] == column['name'])
                    yearExists = 1;
            });

            if (!yearExists)
                columns.push({
                    "id": entry['year'],
                    "name": entry['year'],
                    "field": entry['year'],
                    "sortable": "true"
                });
        });

        // Columns array needs an ID for slickgrid
        columns.push({
            "id": "id",
            "name": "id",
            "field": "id",
            "sortable": "true"
        });

        // Create the array in a wide format
        var dataWide = new Array;

        function createDataWide(id, indicator, country, i) {
            var dataTempObj = {};
            dataTempObj['indicator'] = indicator;
            dataTempObj['country'] = country;
            data.forEach(function(entry) {

                if (dataTempObj['indicator'] == Object.keys(entry)[i] && dataTempObj['country'] == entry['region']) {
                    if (entry[indicator] && entry[indicator] % 1 != 0) //Checks if data exists for year and if it has decimals
                        entry[indicator] = (entry[indicator].toFixed(2))/1; //Rounds number to 2 decimal places
                    dataTempObj[entry['year']] = entry[indicator];
                }
            });
            dataTempObj['id'] = id;
            dataWide.push(dataTempObj);
        }

        data.forEach(function(entry) {

            var numIndicators = Object.keys(entry).length - 3;

            for (i = 0; i < numIndicators; i++) {
                var indicator = Object.keys(entry)[i];

                if (dataWide.length == 0) {
                    createDataWide(0, indicator, entry['region'], i);
                } else {
                    var indicatorCountryExists = 0;
                    var id = 0;
                    dataWide.forEach(function(dataEntry, i) {
                        if (dataEntry['indicator'] == indicator && dataEntry['country'] == entry['region']) {
                            indicatorCountryExists = 1;
                        }
                        id = i + 1;
                    });
                    if (!indicatorCountryExists) {
                        createDataWide(id, indicator, entry['region'], i);
                    }
                }
            }
        });

        for(var i=0;i<dataWide.length;i++){
            if(dataWide[i]["country"]===null)
                dataWide.splice(i,1);
        }

        var options = {
            enableCellNavigation: true,
            enableColumnReorder: true,
            forceFitColumns: false,
            defaultColumnWidth: 150,
            rowHeight: 35
        }

        var dataView = new Slick.Data.DataView();

        // Pass it as a data provider to SlickGrid.
        var grid = new Slick.Grid("#data-table", dataView, columns, options);

        // Make the grid respond to DataView change events.
        dataView.onRowCountChanged.subscribe(function(e, args) {
            grid.updateRowCount();
            grid.render();
        });

        dataView.onRowsChanged.subscribe(function(e, args) {
            grid.invalidateRows(args.rows);
            grid.render();
        });

        dataView.setItems(dataWide);

        grid.onSort.subscribe(function(e, args) {
            var comparer = function(a, b) {
                return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
            }

            dataView.sort(comparer, args.sortAsc);
        });

        columns.forEach(function(column,i){
            saveFields.push(column.field);
        });
        saveData = dataWide;
    }

    //var converter = require('json-2-csv');

    $("#savexlsx").click(function(){
        exportData('xlsx');
    });

    $("#savecsv").click(function(){
        exportData('csv');
    });

    var exportData = function(type) {

        var wb = {} //work book
        wb.Sheets = {};
        wb.Props = {};
        wb.SSF = {};
        wb.SheetNames = ['FIND Data Export'];  //name all your sheets

        //make new work sheet
        //array of arrays in variable data
        //first array is headers
        //one new array for each site's data
        ws = {}
        data = [];
        data.push(saveFields);

        //sets saveData to proper columns
        saveData.forEach(function(entry) {
            dataTemp = [];
            saveFields.forEach(function(field){
                dataTemp.push(entry[field]);
            });
            data.push(dataTemp);
        });

        /* the range object is used to keep track of the range of the sheet */
        var range = {
            s: {
                c: 0,
                r: 0
            },
            e: {
                c: 0,
                r: 0
            }
        };

        /* Iterate through each element in the structure */
        for (var R = 0; R != data.length; ++R) {
            if (range.e.r < R) range.e.r = R;
            for (var C = 0; C != data[R].length; ++C) {
                if (range.e.c < C) range.e.c = C;

                /* create cell object: .v is the actual data */
                var cell = {
                    v: data[R][C]
                };
                if (cell.v == null) continue;

                /* create the correct cell reference */
                var cell_ref = XLSX.utils.encode_cell({
                    c: C,
                    r: R
                });

                /* determine the cell type */
                if (typeof cell.v === 'number') cell.t = 'n';
                else if (typeof cell.v === 'boolean') cell.t = 'b';
                else cell.t = 's';

                /* add to structure */
                ws[cell_ref] = cell;
            }
        }
        ws['!ref'] = XLSX.utils.encode_range(range);

        //there are some options you can add, wch sets column width
        var wscols = [{
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }, {
            wch: 20
        }];
        ws['!cols'] = wscols;

        /* add worksheet to workbook */
        wb.Sheets["FIND Data Export"] = ws;

        // workbook options
        var wopts = {
                        bookType: 'xlsx',
                        bookSST: false,
                        type: 'binary'
                    };

        //writes workbook
        var wbout = XLSX.write(wb, wopts);

        /*convert to CSV if needed*/
        if (type == 'csv');
            var csv = XLSX.utils.sheet_to_csv(ws);

        function s2ab(s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }

        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!

        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd
        }
        if (mm < 10) {
            mm = '0' + mm
        }
        var today = dd + '_' + mm + '_' + yyyy;

        //USES FILESAVER.JS LIBRARY !! not associated with sheetjs
        if (type == 'csv') {
            saveAs(new Blob([s2ab(csv)],{type:"application/octet-stream"}), "FINDdata_" + today + ".csv")
        } else {
            saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), "FINDdata_" + today + ".xlsx")
        }
    }

    var addDataToGeoJson = function(lastGeoJson, type,countries) {

        var data = window.loader.data;
        var gjson = lastGeoJson;

        var hashParams = window.utils.getHashParams();
        var yearsFilter = hashParams.f.split("|");
        var indicators = hashParams.i.split("|");
        var onlyIndicator = indicators[0];
        var regions = hashParams.r.split("|");
        var maxYear = yearsFilter[1]; //2013

        debugger;
        if (regions[0].indexOf(":") > -1) {
            regions = window.countries;
        }
        //debugger;
        var dataByRegion = {};
        _.map(regions, function(_r) {
            dataByRegion[_r] = 0;
        });

        var usePrefix = false;

        if (regions[0].indexOf(":") > -1) {
            usePrefix = true
        }

        _.map(data.cells, function(_c) {
            if (_c.year == parseInt(maxYear)) {
                if (usePrefix) { //if not countries
                    dataByRegion[type + ":" + _c.region] = _c[onlyIndicator + "__avg"];
                } else {
                    dataByRegion[_c.region] = _c[onlyIndicator + "__avg"];
                }
                //debugger;
            }
        });

        _.forEach(gjson.features, function(_f) {
            var name = _f.properties.sovereignt || _f.properties.usaid_reg || _f.properties.continent || _f.properties.dod_cmd || _f.properties.dos_region || _f.properties.wb_inc_lvl;
            if (name) {

                var _r = name.toLowerCase();
                if (usePrefix) { //if not countries
                    _r = type + ":" + name;
                }
                //debugger;
                if (_.indexOf(regions, _r) > -1) {
                    _f.properties[onlyIndicator] = _.round(dataByRegion[_r], 2);
                }
            }

        });

        window.loader.lastGeoJson = gjson;
        window.loader.indicator = onlyIndicator; //indicator;
        // debugger;
    }

    var addChoroplethLayer = function(lastGeoJson, type, cluster, onlyIndicator,countries) {
        var hashParams = window.utils.getHashParams();
        // var yearsFilter = hashParams.f.split("|");
        // var maxYear = yearsFilter[1];
        var regions = hashParams.r.split("|");

        window.loader.geoJson[type] = lastGeoJson;
        //debugger;
        //window.loader.geoJsonLayers[type] = L.geoJson(lastGeoJson);

        window.utils.highlightOnMapViz(regions, type, cluster, onlyIndicator, window.loader.lastGeoJson,window.countries);
        // debugger;
        //window.utils.zoomToFeatures(featuresAdded);

    }

    var geoJSONHandler = function(response, type, cluster,countries) {

        var hashParams = window.utils.getHashParams();
        var yearsFilter = hashParams.f.split("|");
        var maxYear = yearsFilter[1];
        var regions = hashParams.r.split("|");
        var indicators = hashParams.i.split("|");
        var onlyIndicator = indicators[0];

        window.loader.lastGeoJson = response;

        addDataToGeoJson(window.loader.lastGeoJson, type, window.countries);

        addChoroplethLayer(window.loader.lastGeoJson, type, cluster, onlyIndicator,window.countries);

        window.utils.addLegend(cluster);

        //if (!window.visualization.geoJsonLayers[type]) {
        //if layer doesnt exist then add it and symbolize as invisible

        return;


        /*function onEachFeature(feature, layer) {

            if (feature.properties) {
                var name = feature.properties.sovereignt || feature.properties.usaid_reg || feature.properties.continent || feature.properties.dod_cmd || feature.properties.dos_region || feature.properties.wb_inc_lvl;
                layer.bindPopup(name);
            }
        }

        lastGeoJson = response;

        //if (!window.visualization.geoJsonLayers[type]) {
        //if layer doesnt exist then add it and symbolize as invisible
        geoJson[type] = response;

        geoJsonLayers[type] = L.geoJson(response, {
            style: {

                weight: 0, //no border
                opacity: 1,
                color: 'gray',
                //dashArray: '3',
                fillOpacity: 1.0, //DO NOT DISLAY
                fillColor: '#f7a2a2'
            },
            onEachFeature: onEachFeature
        });

        for (var _type in geoJsonLayers) {
            if (type == _type) {
                map.addLayer(geoJsonLayers[_type]);
            }
        }*/

        /*} else {
            //if layer exists bring it on top

        }*/

    }

    var getGeoJsonForMap = function(cluster, cells, type,countries) {
        /* var groupId = "sovereignt";
        debugger;*/

        if (type == "name") {
            type = "sovereignt";
        }

        geometryType = type;

        if (!window.loader.geoJsonLayers[type]) {
            window.loader.loadGeoJSON(type, geoJSONHandler, cluster,window.countries);
        } else {

        }

    };

    var indicatorDataLoadHandler = function(args) {

        //this might be the basic data loader
        var responseDeferred = args;

        indicatorsNoDataRemoved= _.remove(responseDeferred, function(r) {
            return !r[0].cells;
        });


        var statsData = _.remove(responseDeferred, function(r) {
            return r[0].attributes.length == 1 && r[0].attributes[0] == "geometry__time.time";
        });


        var indicatorsData = responseDeferred;

        _.forEach(indicatorsData, function(response) {

            var data = response[0];


            _.forEach(data.attributes, function(v){
                if (v == "geometry__country_level0"){
                    data.cutBy = "name";
                    return false;
                }
                else if (v.indexOf("geometry__country_level0") > -1){
                    data.cutBy = v.split(".")[1];
                    return false;
                }
            });

        });
        //debugger;
        //normalize the data now

        var mergedCells = [];

        var type = "sovereignt"; // for map visualization, getGeoJsonForMap needs this

        _.forEach(indicatorsData, function(response) {

            var data = response[0];
            var cutBy = data.cutBy;
            type = cutBy;

            _.forEach(data.cells, function(cell) {
                cell.region = cell["geo__" + cutBy];

                cell.year = cell['time'];

                delete cell['time'];
                delete cell["geo__" + cutBy];
                delete cell.count;

                /*remove from API?*/
                for (var id in cell) {
                    if (id.indexOf("__max") > -1) {
                        delete cell[id];
                    }

                    if (id.indexOf("__min") > -1) {
                        delete cell[id];
                    }

                    if (id.indexOf("__sum") > -1) {
                        delete cell[id];
                    }
                }

            });

            mergedCells = mergedCells.concat(data.cells);

        });


        //var responseData = args[0];
        var responseData = {
            cells: mergedCells
        }
        
        var responseStats = statsData[0];

        for(var i=0;i<responseData.cells.length;i++)
            {
                if(window.countries.indexOf(responseData.cells[i].region)>-1)
                {
                    break;
                }
                else{
                    window.countries.push(responseData.cells[i].region);
                }
            }

        if (chartType == "map") {

            

           /* for(var i=0;i<responseData.cells.length;i++)
            {
                if(window.countries.indexOf(responseData.cells[i].region)>-1)
                {
                    break;
                }
                else{
                    window.countries.push(responseData.cells[i].region);
                }
            }*/



            $("#loading").hide();

            map = L.map('viz-container').setView([0, 0], 3);

            window.loader.data = responseData;
            cluster = responseStats[0].cluster

            var regType = hashParams.r.split("|");

            regType="sovereignt";

            getGeoJsonForMap(cluster, responseData, regType, window.countries);

            showTable(responseData);

            //window.loader.changeGroup("all");
        } else {

            //yearsExtremesForData = window.utils.getHashParams().f.split("|");

            var sortedData = window.utils.prepareHighchartsJson(responseData, responseStats[0], chartType, indicators, yearsExtremesForData);
            
            var highChartsJson = sortedData.highcharts;
            //add the min,max and avg to the data-proxy span
            if (chartType == "bar") {
                $("#bar-globals").show();
                $("#data-proxy").data("min", highChartsJson.series[0].data[0][1]);
                $("#data-proxy").data("max", highChartsJson.series[0].data[1][1]);
                $("#data-proxy").data("avg", highChartsJson.series[0].data[2][1]);
                // console.log(highChartsJson.series[0].data);
                // console.log(highChartsJson.series[0].data[0][0]);                
                // console.log(highChartsJson.series[0].data);
                // console.log(highChartsJson.series);
                // $.each(highChartsJson.series, function(k,v){
                //     console.log(k + " : " + v);
                //     $.each(v, function(a,b){ 
                //         console.log(a + " : " + b);
                //     });
                // });
            } else {
                $("#bar-globals").hide();
            }

            highChartsJson.chart.events = {
                load: function() {

                    var allowedSetExtremeCharts = ["line"];
                    var xAxis = this.series[0].xAxis;
                    if (chartType == "bar") {
                        yearsFilter[0] = yearsFilter[1];
                    }

                    $("#loading").hide();

                    if (_.indexOf(allowedSetExtremeCharts, chartType) > -1) {
                        xAxis.setExtremes(yearsFilter[0], yearsFilter[1]);
                    }

                }
            }
            //debugger;
            //highChartsJson.subtitle.text = type;
            var chart = $('#viz-container').highcharts(highChartsJson);
            //debugger;
            showTable(responseData);
            //debugger;
        }
    }

    var useNarrowExtremes = true;

    var setExtremes = function(startYear, endYear) {

        var chart = $('#viz-container').highcharts();
        if (chart) {
            var xAxis = chart.series[0].xAxis;

            xAxis.setExtremes(startYear, endYear);
        }


    }

    var updateChartData = function(year) {
        //debugger;
        var activeChart = $('#viz-container').highcharts();
        //first three series are the stats
        //debugger;
        var json = window.utils.prepareHighchartsJson({
            cells: window.utils.masterCells
        }, {
            cells: window.utils.statsData
        }, chartType, indicators, year);

        if (chartType == "scatter") {
            var series = json.highcharts.series;

            //debugger;
            _.forEach(series, function(s, i) {
                var data = s.data;
                if (i > 2)
                    activeChart.series[i].setData(data, true);
            });
        }

        if (chartType == "bubble") {
            var seriesArray = json.highcharts.series;
            //debugger;
            _.forEach(seriesArray, function(s, i) {
                var data = s.data;
                if (i > 2) {
                    activeChart.series[i].setData(data, true);
                }
            });
        }

        if (chartType == "bar") {

            var series = json.highcharts.series[0];
            var dataMapping = {};
            _.forEach(series.data, function(d, i) {
                var data = d;
                if (!dataMapping[d[0]]) {
                    dataMapping[d[0]] = d[1];
                }
            });

            var currentData = _.map(activeChart.series[0].data, function(d) {
                return [d.name, d.y];
            });

            //update current data with new data
            //debugger;
            _.forEach(currentData, function(d, i) {
                var data = d;
                if (i > 2) {
                    d[1] = dataMapping[d[0]];
                }
            });
            //debugger;
            activeChart.series[0].setData(currentData, true);

        }



    };
    //debugger;

    //deferred.done(indicatorDataLoadHandler);


    var indicatorListLoadHandler = function(response) {


      var res = response;


        //debugger;
        _.forEach(indicators, function(indicatorId) {
            var years = response.data.indicators.data[indicatorId].years;
            var yearStart = years[0];
            var yearEnd = years[years.length - 1];

            if (yearsExtremes.length == 0) {

                yearsExtremes.push(yearStart);
                yearsExtremes.push(yearEnd);
                //debugger;
            } else {

                if (yearStart > yearsExtremes[0]) {
                    yearsExtremes[0] = yearStart;
                }

                if (yearEnd < yearsExtremes[1]) {
                    yearsExtremes[1] = yearEnd;
                }
                //debugger;
            }

            if (yearsExtremesForData.length == 0) {
                yearsExtremesForData.push(yearStart);
                yearsExtremesForData.push(yearEnd);

            } else {

                if (yearStart > yearsExtremesForData[0]) {
                    yearsExtremesForData[0] = yearStart;
                }

                if (yearEnd < yearsExtremesForData[1]) {
                    yearsExtremesForData[1] = yearEnd;
                }
            }

        });

        if (yearsExtremes[0] < 1990) {
            yearsExtremes[0] = 1990;
        }
        //debugger;
        //create slider first
        createYearSlider(yearsExtremes[0], yearsExtremes[1]);

        window.utils.bindIndicators(response, model);

        //now get the data
        if (indicators.length > 1) {
            //switch to group by indicators
            groupBy = "indicators";
        }

        // temp localstorage
        // store a variable for a counter for # of 500 errors
        // initally after a few tries, automatically reload the page
        // if errors persist, fail gracefully
        if (localStorage.getItem("error_counter") === null) {
            localStorage.setItem('error_counter', '0')
        }
        var num_errors = +localStorage.getItem('error_counter');

        function takeDataDrawChart() {
          // meta data

          // chart data
          var deferredList = window.loader.loadIndicatorData(indicators, regions, yearsExtremes);

          $.when.apply($, deferredList)
          .done(function(response) {
              indicatorDataLoadHandler(arguments, yearsExtremes);
          })
          .fail(function(response){
            if ( num_errors < 2 ){
              // update counter
              localStorage.setItem('error_counter', num_errors + 1);
              // hard refresh
              location.reload();
            } else {
              // reset counter
              localStorage.setItem('error_counter', '0');
              // no more hard refresh, fail gracefully
              $("#loading").html('We\'re sorry! The server has encountered an error: Please <a style="color:#336b99;font-weight:600;" href="javascript:location.reload();">Click Here</a> to reload.');
            }

          });



        }

        takeDataDrawChart();
        window.utils.flipCardEvent();

    }

    indicatorListLoadHandler(window.preloadedData.categories_list);

    var countriesListLoadHandler = function(response) {

        window.utils.bindCountries(response, model);

    }

    window.utils.bindCountries(window.preloadedData.countries_list, model);

    initialize();

}())