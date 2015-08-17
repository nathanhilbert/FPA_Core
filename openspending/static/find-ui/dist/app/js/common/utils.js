var act;

// test code for #228
// function onMapClick(e) {
//     alert("You clicked the map at " + e.latlng);
// }
// $("#map").on('click', onMapClick);

(function() {
    window.utils = {};

    window.utils.masterCells = [];

    window.utils.flipCardEvent = function() {

        $(".flip").click(function() {



            if (window.expandedCategory) {
                window.expandedCategory = false;
                return;
            }

            if (window.clickedIndicator) {
                window.clickedIndicator = false;
                return;
            }

            $(".flip").css("z-index", 10);
            $(this).css("z-index", 1000);
            $(".flip").find("div.list-group").removeClass("shadow");

            $(this).find("div.list-group").addClass("shadow");

            var isFlipped = $(this).find(".card").hasClass("flipped");

            $(".flip").find(".card").removeClass("flipped");
            $(".flip").removeClass("flippedCol");
            //- $(".list-group").css("display": "none");

            if (isFlipped) {
                //$(this).find(".card").removeClass("flipped");
                // $(this).find(".list-group").removeClass("show-me");

            } else {
                $(this).find(".card").addClass("flipped");
                $(this).addClass("flippedCol");

                //$(this).find(".list-group").addClass("show-me");
            }
            return true;
        });
    }

    window.utils.getHashParams = function() {

        var hashParams = {};
        var e,
            a = /\+/g, // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            },
            q = window.location.hash.substring(1);

        while (e = r.exec(q))
            hashParams[d(e[1])] = d(e[2]);

        return hashParams;
    }

    window.utils.updateHash = function(hashObj) {

        var result = decodeURIComponent($.param(hashObj));
        window.location.hash = result;
    }

    window.utils.bindIndicators = function(response, model) {
        //debugger;
        var categoriesAll = response.data.categories;
        var subcategoriesAll = response.data.subcategories;
        var sourcesAll = response.data.sources;
        var indicatorsAll = response.data.indicators;

        var categoriesModel = [];
        var sourcesModel = [];
        var indicatorsModel = [];

        //Sort out Categories
        for (var cat in categoriesAll.data) {

            var isOnlyCategory = function(indicatorId) {
                return indicatorsAll.data[indicatorId].subcategory === "None";
            }

            var isSubCategory = function(indicatorId) {
                return indicatorsAll.data[indicatorId].subcategory != "None";
            }

            var makeIndicator = function(indicatorId) {
                var sourceId = _.get(indicatorsAll, 'data[indicatorId].source');
                var sourceLabel = _.get(sourcesAll, 'data[sourceId].label');

                var cloneIndicator = _.clone(indicatorsAll.data[indicatorId], true);

                cloneIndicator.source = sourceLabel;
                cloneIndicator.id = indicatorId;
                cloneIndicator.selected = false;

                return cloneIndicator;
            }

            var indicatorsIdsInCategory = _.filter(categoriesAll.data[cat].indicators, _.negate(isSubCategory));

            var indicatorsIdsInSubCategory = _.filter(categoriesAll.data[cat].indicators, _.negate(isOnlyCategory));

            var indicatorsInCategory = _.map(indicatorsIdsInCategory, makeIndicator);
            var indicatorsInSubCategory = _.map(indicatorsIdsInSubCategory, makeIndicator);

            //arrange subcategories in order
            var subcategories = [];

            var subcategoriesTracker = [];

            _.forEach(indicatorsInSubCategory, function(indicator) {

                var subCatIndex = _.indexOf(subcategoriesTracker, indicator.subcategory);

                if (subCatIndex < 0) {
                    //debugger;
                    var newSubCategory = {
                        "id": indicator.subcategory,
                        "label": subcategoriesAll.data[indicator.subcategory].label,
                        "indicators": [indicator],
                        "selected": false
                    }
                    subcategoriesTracker.push(indicator.subcategory);
                    subcategories.push(newSubCategory);
                } else {
                    subcategories[subCatIndex].indicators.push(indicator);
                }

            });

            if (subcategories.length > 0 && indicatorsInCategory.length > 0) {
                var generalSubCategory = {
                    "label": "General",
                    "indicators": indicatorsInCategory,
                    "selected": false
                }
                subcategories.unshift(generalSubCategory);
            }


            //debugger;
            var newCategory = {
                "label": categoriesAll.data[cat].label,
                "length": categoriesAll.data[cat].indicators.length,
                "indicators": indicatorsInCategory,
                "subcategories": subcategories
            }



            categoriesModel.push(newCategory);

        }
        //debugger;
        //Sort out Sources
        for (var src in sourcesAll.data) {

            var indicatorsInSource = _.map(sourcesAll.data[src].indicators, function(indicatorId) {

                var categoryId = _.get(sourcesAll, 'data[indicatorId].category');
                var categoryLabel = _.get(sourcesAll, 'data[categoryId].label');

                var cloneIndicator = _.clone(indicatorsAll.data[indicatorId], true);

                cloneIndicator.source = categoryLabel;
                cloneIndicator.id = indicatorId;
                cloneIndicator.selected = false;
                return cloneIndicator;

            });

            var newSource = {
                "label": sourcesAll.data[src].label,
                "length": sourcesAll.data[src].indicators.length,
                "indicators": indicatorsInSource
            }

            sourcesModel.push(newSource);

        }
        //debugger;
        //Get the actual categories and sources
        for (var ind in indicatorsAll.data) {

            var newIndicator = indicatorsAll.data[ind];
            var sourceId = newIndicator.source;
            var categoryId = newIndicator.category;


            newIndicator.source = _.get(sourcesAll, 'data[sourceId].label');
            newIndicator.category = _.get(categoriesAll, 'data[categoryId].label');
            newIndicator.id = ind;
            newIndicator.selected = false;
            //newIndicator.popup = newIndicator.source + "<br>" + newIndicator.category;
            indicatorsModel.push(newIndicator);



        }
        // debugger;

        model.categoriesModel(categoriesModel);
        model.sourcesModel(sourcesModel);
        model.indicatorsModel(indicatorsModel);
        model.indicatorsModelMaster(_.clone(indicatorsModel, true));
    };

    window.utils.bindCountries = function(response, model) {



        var countryGroupings = _.clone(model.countryGroupings(), true);

        //push regions in country groupings
        _.forEach(countryGroupings, function(countryGroup, i) {

            var groupId = countryGroup.id;
            countryGroup.selected = false;
            countryGroup.filtered = false;
            countryGroup.geounit = groupId + ":all";

            if (countryGroup.id != "all") {
                var trackRegion = [];
                _.forEach(response.data, function(country) { //for each Country

                    //find level this country belongs to in this group
                    var region = country.regions[groupId];
                    var regionObj = {
                        id: region,
                        label: region,
                        geounit: groupId + ":" + region,
                        countries: [],
                        selected: false,
                        filtered: false
                    }

                    if (_.indexOf(trackRegion, region) < 0) {
                        trackRegion.push(region);
                        //debugger;
                        countryGroup.regions.push(regionObj);
                    }

                });
            } else {

                countryGroup.regions.push({ //push a region called All for All
                    id: "all",
                    label: "All Countries",
                    countries: [],
                    selected: false,
                    filtered: false
                });

            }


        });

        //push country in regions
        _.forEach(countryGroupings, function(countryGroup, i) {

            _.forEach(countryGroup.regions, function(region) {

                _.forEach(response.data, function(country) { //for each Country
                    var regionId = region.id;

                    var c = countryGroup;

                    if (country.regions[countryGroup.id] == regionId || regionId == "all") {
                        country.selected = false;
                        country.filtered = false;
                        country.id = country.iso_a2;
                        region.countries.push(country);
                    }

                });

            });

        });



        model.countryGroupings.removeAll();

        _.forEach(countryGroupings, function(countryGroup, i) {
            model.countryGroupings.push(countryGroup);
        });


        _.forEach(response.data, function(country) {
            country.selected = false;
        });


        model.countriesModel(response.data);
        model.countriesModelMaster(_.clone(response.data, true));

        model.activeGroup(countryGroupings[0]);
    };

    window.utils.removeOnMap = function(model, geounits) { //clear a single country
        // debugger;
        // console.log("removeOnMap has been called!");
        // console.log("Geounits is: " + JSON.stringify(geounits));
        // console.log("Act (from removeOnMap) is: " + JSON.stringify(act));
        // rc(act);
        window.map.removeLayer(window.visualization.geoJsonLayers[level]);
        $.each(vizModel.activeCountries(), function(idx, country) {
            // console.log(country);
            // alert(JSON.stringify(country));
            window.utils.highlightOnMap(vizModel, country);
        });
        // window.utils.highlightOnMap(vizModel, act);
        // var level = "sovereignt";        
        // window.map.removeLayer(window.visualization.geoJsonLayers[level]);
    };

    window.utils.clearOnMap = function(model) { // clear all of map
        // debugger;

        var level = "sovereignt";
        window.map.removeLayer(window.visualization.geoJsonLayers[level]);
    };

    window.utils.highlightOnMapViz = function(country, region, gjson) {

        var geojson = gjson['features'];

        var featuresAdded = [];

        var level = "sovereignt";

        //debugger;
        //console.log(window.loader.indicator);

        var style = function(feature) {

            //console.log("*********feature" + feature);
            if (country == feature.properties[level].toLowerCase()) {

                var polygon = L.multiPolygon(feature.geometry.coordinates);
                //debugger;
                featuresAdded.push(polygon);
                return {
                    weight: 2,
                    opacity: 1,
                    color: '#FFFFFF',
                    //dashArray: '3',
                    fillOpacity: 0.5,
                    fillColor: window.utils.getColor(feature.properties[window.loader.indicator])
                    //fillColor: '#00FF00'////fillColor: '#00FF00'
                };
            } else {
                return {
                    weight: 0,
                    opacity: 0,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.0,
                    fillColor: '#666666'
                };
            }
        }

        var onEachFeature = function(feature, layer) {

            // does this feature have a property named popupContent?
            if (feature.properties) {
                var name = feature.properties.sovereignt || feature.properties.usaid_reg || feature.properties.continent || feature.properties.dod_cmd || feature.properties.dos_region || feature.properties.wb_inc_lvl;
                layer.bindPopup(name + "</br>" + feature.properties[window.loader.indicator]);
            }
        }
        window.loader.geoJsonLayers[level] = L.geoJson(window.loader.geoJson[level], {
            onEachFeature: onEachFeature,
            style: style
        });

        map.addLayer(window.loader.geoJsonLayers[level]);
        debugger;
        //window.utils.addLegend();
    };

    /*  window.utils.getColor=function(d) {
    return d > 1000 ? '#800026' :
           d > 500  ? '#BD0026' :
           d > 200  ? '#E31A1C' :
           d > 100  ? '#FC4E2A' :
           d > 50   ? '#FD8D3C' :
           d > 20   ? '#FEB24C' :
           d > 10   ? '#FED976' :
                      '#FFEDA0';
},*/

    window.utils.getColor = function(d) {
        console.log(d);
        debugger;
        d = d + 5000;
        return d > 50000 ? '#800026' :
            d > 40000 ? '#BD0026' :
            d > 30000 ? '#E31A1C' :
            d > 20000 ? '#FC4E2A' :
            d > 10000 ? '#FD8D3C' :
            d > 5000 ? '#FEB24C' :
            d > 1000 ? '#FED976' :
            '#FFEDA0';
    };

    window.utils.addLegend = function() {
        var legend = L.control({
            position: 'bottomleft'
        });

        legend.onAdd = function(map) {
            debugger;
            var div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 1000, 5000, 10000, 20000, 30000, 40000, 50000],
                labels = [],
                from, to;

            for (var i = 0; i < grades.length; i++) {
                from = grades[i];
                to = grades[i + 1];

                labels.push(
                    '<i style="background:' + window.utils.getColor(from + 1) + '"></i> ' +
                    from + (to ? '&ndash;' + to : '+'));
            }

            div.innerHTML = labels.join('<br>');
            return div;
        };

        legend.addTo(map);

    };

    window.utils.highlightOnMap = function(model, geounit) {
        // console.log("Geounit from highlightOnMap is: " + JSON.stringify(geounit));

        var featuresAdded = [];
        //if all then select all countries in countriesModel, else activeCountries
        var isCountry = geounit.iso_a2;
        var drillDown = false;

        if (isCountry) {
            level = "sovereignt";
        } else {
            level = geounit.geounit.split(":")[0];
            drillDown = _.indexOf(geounit.geounit.split(":"), "all") > -1;
        }

        //first remove the layer
        var activeCountries = model.activeCountries();
        act = activeCountries;
        // console.log("Active countries is: " + JSON.stringify(activeCountries));
        // console.log("Act is: " + JSON.stringify(act));
        var listOfLabels = _.map(activeCountries, function(_a) {
            return _a.label;
        });

        var drillDownLabels = [];

        if (drillDown) {
            if (geounit.countries) {
                level = "sovereignt";
                var drillDownLabels = _.map(geounit.countries, function(_a) {
                    return _a.label;
                });
            }
            if (geounit.regions) {
                level = geounit.geounit.split(":")[0];
                var drillDownLabels = _.map(geounit.regions, function(_a) {
                    return _a.label;
                });

            }
        }


        window.map.removeLayer(window.visualization.geoJsonLayers[level]);
        //debugger;
        var style = function(feature) {

            if ((drillDown && (_.indexOf(drillDownLabels, feature.properties[level]) > -1)) || (feature.properties[level] == geounit.label) || _.indexOf(listOfLabels, feature.properties[level]) > -1) {
                //debugger;
                var polygon = L.multiPolygon(feature.geometry.coordinates);

                featuresAdded.push(polygon);
                return {
                    weight: 2,
                    opacity: 1,
                    color: '#FFFFFF',
                    //dashArray: '3',
                    fillOpacity: 0.5,
                    fillColor: '#00FF00'
                };
            } else {
                return {
                    weight: 0,
                    opacity: 0,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.0,
                    fillColor: '#666666'
                };
            }
        }

        var onEachFeature = function(feature, layer) {

            // does this feature have a property named popupContent?
            if (feature.properties) {
                var name = feature.properties.sovereignt || feature.properties.usaid_reg || feature.properties.continent || feature.properties.dod_cmd || feature.properties.dos_region || feature.properties.wb_inc_lvl;
                layer.bindPopup(name);
            }
        }
        window.visualization.geoJsonLayers[level] = L.geoJson(window.visualization.geoJson[level], {
            onEachFeature: onEachFeature,
            style: style
        });
        // debugger;
        map.addLayer(window.visualization.geoJsonLayers[level]);

        /*var countries = model.countriesModel();

        if (model.activeCountries().length > 0) {
            countries = model.activeCountries();
        }

        var countriesGeounit = _.map(countries, function(country) {
            return country.label;
        });*/



        // debugger;






        return;

        setTimeout(function() {


            /*L.geoJson(geoJsonLayers["sovereignt"].toGeoJSON(), {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(window.map);*/

            var group = new L.featureGroup(featuresAdded);
            var bounds = group.getBounds();


            var southWestLng = bounds._southWest.lng;
            var northEastLng = bounds._northEast.lng;

            bounds._southWest.lng = bounds._southWest.lat;
            bounds._southWest.lat = southWestLng;
            bounds._northEast.lng = bounds._northEast.lat;
            bounds._northEast.lat = northEastLng;


            map.fitBounds(bounds);
        }, 0);

    }

    window.utils.prepareHighchartsJson = function(data, statsData, indicatorsMeta, type, indicators, yearsExtremesForData) {
        //debugger;
        //var defaultCountries = ["australia", "new zealand", "sweden", "germany", "france", "ghana", "kenya", "south africa", "bangladesh", "pakistan", "cambodia"];
        //var defaultVisibleCountries = ["australia", "germany", "kenya", "cambodia"];

        var cells = data.cells;
        //debugger;
        var statsCells = statsData.cells;
        var indicatorId = indicators[0];
        var title = indicators[0];
        //var groupId = group;
        //var cutBy = "name";
        var dataType = "avg"; //sum,avg
        var multiVariate = indicators.length > 1; //eligible for scatter plot
        // var seriesAverage = [];
        // var dataByYear = [];

        var fromYear = 1990; //timeCell.from[0];
        var toYear = 2015; //timeCell.to[0];

        var categories = [];

        for (var i = fromYear; i <= toYear; i++) {
            categories.push(parseInt(i));
        }

        var series = {
            "Global Minimum": [],
            "Global Maximum": [],
            "Global Average": [],
        };


        //Add stats to series
        _.forEach(statsCells, function(c) {
            //(c["geometry__time"] >= fromYear) && (c["geometry__time"] <= toYear) &&
            //if ((groupId == "all" || c["geometry__country_level0." + groupId] == region)) {
            series["Global Minimum"].push([c["geometry__time"], c[indicatorId + "__amount_min"]]);
            series["Global Maximum"].push([c["geometry__time"], c[indicatorId + "__amount_max"]]);
            series["Global Average"].push([c["geometry__time"], c[indicatorId + "__amount_avg"]]);
            // }
        });



        //debugger;
        var seriesArray = [];
        if (window.utils.masterCells.length == 0)
            window.utils.masterCells = window.utils.masterCells.concat(cells);
        //debugger;
        var _cells = window.utils.masterCells;

        _.forEach(_cells, function(c) {
            if (c.region) {
                series[c.region] = [];
            }
        });

        _.forEach(_cells, function(c) {
            if (c.region) {
                series[c.region].push([c.year, c[indicatorId + "__amount_" + dataType]]);
            }
        });

        var titleArray = _.map(indicatorsMeta, function(meta) {
            return meta[0].label;
        });

        var title = titleArray.join(" and ");

        var subtitleObj = _.map(indicatorsMeta, function(meta) {
            return meta = {
                "label": meta[0].label,
                "url": meta[0].url,
                "dataorg": meta[0].dataorg
            };
        });

        var subtitleArray = _.map(subtitleObj, function(subtitleArray, i) {
            var source = subtitleObj[i].dataorg || '-';
            //return subtitleArray = subtitleObj[i].label + ' (<a href="'+subtitleObj[i].url+'" style="color:#852224" target="_blank">'+source+'</a>)';
            return subtitleArray = subtitleObj[i].label + ' (<a href="" target="_blank">' + source + '</a>)';
        });
        //debugger;
        var subtitle = "Sources: " + subtitleArray.join(", ");

        var counter = 1;
        var countriesArr = [];
        Object.size = function(obj) {
            var size = 0,
                key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };
        var size = Object.size(series);
        for (var countryName in series) {
            var visible = false;
            // if (defaultVisibleCountries.indexOf(countryName) > -1) {
            visible = true;
            //  }
            //window.averageSeries = series[countryName];
            // if (defaultCountries.indexOf(countryName) > -1) {
            //debugger;
            seriesArray.push({
                name: countryName,
                data: series[countryName],
                visible: counter > 3 || size == 3 ? true : false,
                zIndex: counter++
            });

            countriesArr.push(countryName);


            // }
        }
        //debugger;
        seriesArray[0].zIndex = seriesArray.length + 1;
        seriesArray[1].zIndex = seriesArray.length + 2;
        seriesArray[2].zIndex = seriesArray.length + 3;

        //debugger;

        var chartObj = {

            type: type
        };

        if (type == "radar") {
            chartObj.polar = true;
            chartObj["type"] = "line";
        }

        var jsonLine = {
            chart: chartObj,
            title: {

                text: title,
                x: -20
            },
            subtitle: {

                text: subtitle,
                x: -20
            },
            xAxis: {
                //categories: categories
                title: {
                    enabled: true,
                    text: ''
                },
                startOnTick: true,
                endOnTick: true,
                showLastLabel: true
            },
            yAxis: {
                title: {
                    text: ''
                },
                plotLines: [{
                    value: 0,
                    width: 0.25,
                    color: '#FFFFCC'
                }]
            },
            tooltip: {
                valueSuffix: ''
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0,
                width: 200,
                itemWidth: 100
            },
            series: seriesArray
        }

        //debugger;
        // x - indicator 1
        // y indicator 2
        // one year
        // one region
        // size on bubble would be the third indicator
        // user should be able to switch between the x, y and z
        var latestYear = yearsExtremesForData[1];
        var firstYear = yearsExtremesForData[0];

        if (type == "scatter") {

            seriesArray = [];

            //debugger;

            var indicator1 = indicators[0];
            var indicator2 = indicators[1];

            series = [];
            var globalType;
            var indicatorSuffix;

            for (i = 0; i < 3; i++) {
                switch (i) {
                    case 0:
                        globalType = "Global Minimum";
                        indicatorSuffix = "min";
                        break;
                    case 1:
                        globalType = "Global Maximum";
                        indicatorSuffix = "max";
                        break;
                    case 2:
                        globalType = "Global Average";
                        indicatorSuffix = "avg";
                        break;
                }
                dataArray = [];
                //debugger;
                _.forEach(statsCells, function(c) {
                    //if (c.geometry__time <= latestYear)
                    dataArray.push({
                        x: c[indicator1 + "__amount_" + indicatorSuffix],
                        y: c[indicator2 + "__amount_" + indicatorSuffix],
                        year: c.geometry__time
                    });
                });
                var visible = size == 3 ? true : false;
                series.push({
                    name: globalType,
                    data: dataArray,
                    visible: visible,
                    tooltip: {
                        pointFormat: '<b>' + indicator1 + ':</b> {point.x}<br/><b>' + indicator2 + ':</b> {point.y}<br/><b>year :</b> {point.year}'
                    },
                });
            }
            //debugger;
            _.forEach(_cells, function(c) {
                //debugger;
                if (latestYear == c.year) {
                    dataArray = [];
                    _.forEach(_cells, function(d) {
                        if (c.region == d.region && d.year >= firstYear && d.year <= latestYear) {
                            if (!!d[indicator1 + "__amount_" + dataType] && !!d[indicator2 + "__amount_" + dataType])
                                dataArray.push({
                                    x: d[indicator1 + "__amount_" + dataType],
                                    y: d[indicator2 + "__amount_" + dataType],
                                    year: d.year
                                });
                        }
                    });
                    //debugger;
                    series.push({
                        name: c.region,
                        data: dataArray,
                        tooltip: {
                            pointFormat: '<b>' + indicator1 + ':</b> {point.x}<br/><b>' + indicator2 + ':</b> {point.y}<br/><b>year :</b> {point.year}'
                        },
                    });
                }
            });

            var jsonScatter = {

                chart: {
                    type: 'scatter',
                    zoomType: 'xy'
                },

                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                xAxis: {
                    title: {
                        enabled: true,
                        text: indicatorsMeta[0][0].label
                    },
                    startOnTick: true,
                    endOnTick: true,
                    showLastLabel: true
                },
                yAxis: {
                    title: {
                        text: indicatorsMeta[1][0].label
                    }
                },
                series: series
            }
        }

        if (type == "bubble") {

            seriesArray = [];


            var indicator1 = indicators[0];
            var indicator2 = indicators[1];
            var indicator3 = indicators[2];

            //debugger;
            //debugger;
            _.forEach(statsCells, function(c) {

                if (latestYear === c.geometry__time) {

                    series["Global Minimum"] = {
                        data: [c[indicator1 + "__amount_min"], c[indicator2 + "__amount_min"], c[indicator3 + "__amount_min"]],
                        year: c.geometry__time
                    };
                    series["Global Maximum"] = {
                        data: [c[indicator1 + "__amount_max"], c[indicator2 + "__amount_max"], c[indicator3 + "__amount_max"]],
                        year: c.geometry__time
                    };
                    series["Global Average"] = {
                        data: [c[indicator1 + "__amount_avg"], c[indicator2 + "__amount_avg"], c[indicator3 + "__amount_avg"]],
                        year: c.geometry__time
                    };

                }
            });

            _.forEach(_cells, function(c) {
                if (c.region) {
                    series[c.region] = [];
                }
            });

            _.forEach(_cells, function(c) {
                if (c.region) {
                    if (latestYear == c.year) {
                        series[c.region] = {
                            year: c.year,
                            data: [c[indicator1 + "__amount_" + dataType], c[indicator2 + "__amount_" + dataType], c[indicator3 + "__amount_" + dataType]]
                        };
                    }
                }
            });

            //debugger;
            var counter = 1;
            var countriesArr = [];
            for (var countryName in series) {
                var visible = false;
                visible = true;
                seriesArray.push({
                    name: countryName,
                    data: [series[countryName].data],
                    visible: counter > 3 || size == 3 ? true : false,
                    zIndex: counter++
                });
            }
            //  debugger;

            var jsonBubble = {

                chart: {
                    type: 'bubble',
                    zoomType: 'xy'
                },

                title: {
                    text: title
                },

                subtitle: {
                    text: subtitle
                },

                xAxis: {
                    //categories: categories
                    title: {
                        enabled: true,
                        text: indicatorsMeta[0][0].label
                    },
                    startOnTick: true,
                    endOnTick: true,
                    showLastLabel: true
                },
                yAxis: {
                    title: {
                        text: indicatorsMeta[1][0].label
                    }
                },
                zAxis: {
                    title: {
                        text: indicatorsMeta[2][0].label
                    }
                },

                series: seriesArray
            }
        }

        if (type == "bar") {
            //debugger;

            seriesArray = [];

            var data = [];

            //Add stats to series
            _.forEach(statsCells, function(c) {
                if (latestYear == c.geometry__time) {
                    data.push([
                        "Global Minimum",
                        c[indicatorId + "__amount_min"]

                    ]);
                    data.push([
                        "Global Maximum",
                        c[indicatorId + "__amount_max"]

                    ]);
                    data.push([
                        "Global Average",
                        c[indicatorId + "__amount_avg"]

                    ]);
                }
            });


            _.forEach(_cells, function(c) {
                if (c.region && latestYear == c.year) {
                    //debugger;
                    data.push([c.region, c[indicatorId + "__amount_" + dataType]]);
                }
            });

            // [
            //             ['Firefox', 55.0],
            //             ['IE', 16.8],
            //             ['Safari', 7.5],
            //             ['Opera', 7.2],
            //             ['Others', 0.7]
            //         ]

            //debugger;
            seriesArray = [{
                name: indicatorsMeta[0][0].label,
                data: data
            }];

            var jsonBar = {
                chart: {
                    type: 'column'
                },
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                xAxis: {
                    type: 'category',
                    labels: {
                        rotation: -45,
                        style: {
                            fontSize: '13px',
                            fontFamily: 'Verdana, sans-serif'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: indicatorsMeta[0][0].label
                    }
                },
                legend: {
                    enabled: false
                },
                tooltip: {
                    formatter: function() {
                        var number = this.point.y
                        return indicatorsMeta[0][0].label + '<br/>' + this.key + ': <b>' + Math.floor(this.point.y) + '</b>'
                    }
                },
                series: seriesArray
            }

        }

        var json;
        switch (type) {
            case "line":
                json = jsonLine;
                break;
            case "bar":
                json = jsonBar;
                break;
            case "bubble":
                json = jsonBubble;
                break;
            case "scatter":
                json = jsonScatter;
                break;
        }

        //debugger;
        return {
            highcharts: json
            //average: seriesAverage
        };
    }

}())