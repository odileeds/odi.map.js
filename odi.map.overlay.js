/**
  ODI Leeds Tiny Slippy Map
  Plugin for overlays (e.g. GeoJSON)
  Version 0.1.2
**/
// jshint esversion: 6
(function(root){
		
	function svgEl(t){ return document.createElementNS(ns,t); }
	var ODI = root.ODI || {};
	function renameProps(props,names){
		for(var n in names){
			if(props[n]!=null){
				props[names[n]] = props[n];
				delete props[n];
			}
		}
		return props;
	}

	if(ODI.map){
		var ns = 'http://www.w3.org/2000/svg';
		ODI.map.prototype.register('overlay',{
			'version':'0.1.2',
			'exec':function(_map){
				function Thing(feature,m){
					this.bindPopup = function(txt){
						this._popuptext = txt;
						if(feature.marker) this._el = feature.marker._el.querySelector('path');
						else if(feature.svg) this._el = feature.svg;
						ODI._addEvent('click',this._el,{'popup':txt,el:this._el,this:this},function(e){
							var popup = m.panes.p.popup.el.querySelector('.odi-map-popup');
							if(popup) popup.parentNode.removeChild(popup);
							this._popup = document.createElement('div');
							this._popup.classList.add('odi-map-popup');
							m.panes.p.popup.el.appendChild(this._popup);
							this._popup.innerHTML = '<div class="odi-map-popup-inner">'+e.data.popup+'</div>';
							this.setPosition();
						});
						return this;
					};
					this.setPosition = function(){
						if(this._popup){
							var bb = this._el.getBoundingClientRect();
							var bbo = m.panes.p.popup.el.getBoundingClientRect();
							ODI._setAttr(this._popup,{'style':'top:'+(bb.top-bbo.top).toFixed(1)+'px;left:'+(bb.left-bbo.left+bb.width/2).toFixed(1)+'px;'});
						}
					};
					return this;
				}
				class marker extends _map.Layer {
					constructor(ll,attr,pane){
						super(attr,pane);
						this._ll = ll||ODI.map.LatLon();
						this._el = svgEl('svg');
						this._el.innerHTML = attr.svg;
						ODI._setAttr(this._el,{'xmlns':ns,'version':'1.1','overflow':'visible','width':'0','height':'0'});
					}
					addTo(m){
						this._map = m;
						var p = this._attr.pane;
						if(!m.panes.p[p]) return m.log('ERROR','No pane %c'+p+'%c exists.','font-style:italic;','');
						m.panes.p[p].el.appendChild(this._el);
						m.panes.p[p].layers.push(this);
						this.setLatLon(this._ll);
						return this;
					}
					setLatLon(ll,offset){
						var z,xy;
						z = this._map.getZoom();
						if(!offset) offset = this._map.getCenter().toPx(z);
						xy = ll.toPx(z);
						ODI._setAttr(this._el,{'class':'odi-map-marker','style':'transform:translate3d('+(xy.x-offset.x)+'px,'+(xy.y-offset.y)+'px,0)'});
					}
				}
				class geoJSONLayer extends _map.Layer {
					constructor(json,attr,pane){
						super(attr,pane);
						this._json = json||{};
						this._svg = svgEl('svg');
						this._init = false;

						ODI._setAttr(this._svg,{'xmlns':ns,'version':'1.1','overflow':'visible','preserveAspectRatio':'xMinYMin meet','vector-effect':'non-scaling-stroke'});
						this._el.appendChild(this._svg);
					}
					update(bounds,z){
						var offset,f,xy,nw,se,el,c,i,j,k,d,props,defaults,attr,g;
						// Get tile x/y of centre
						offset = bounds.getCenter().toPx(z);
						nw = bounds.nw.toPx(z);
						se = bounds.se.toPx(z);
						defaults = {'opacity':1,'fillOpacity':0.2,'weight':3,'color':'#3388ff','stroke':true};
						ODI._setAttr(this._svg,{'viewBox':((nw.x-offset.x).toFixed(3)+' '+(nw.y-offset.y).toFixed(3)+' '+(se.x-nw.x).toFixed(3)+' '+(se.y-nw.y).toFixed(3))});
						for(f = 0; f < this._json.features.length; f++){
							props = {};
							if(typeof this._attr.style==="function"){
								props = Object.assign({}, defaults, this._attr.style.call(this,this._json.features[f])||{});
							}
							g = this._json.features[f].geometry;
							c = g.coordinates;
							if(g.type=="Point"){
								if(!this._json.features[f].marker){
									// Create the marker if needed
									attr = {'svg':('<path d="M 0,0 L -10.84,-22.86 A 12 12 1 1 1 10.84,-22.86 L 0,0 z" fill="%COLOUR%" fill-opacity="1"></path><ellipse cx="0" cy="-27.5" rx="4" ry="4" fill="white"></ellipse>').replace(/%COLOUR%/,props.fillColor||defaults.color)};
									this._json.features[f].marker = ODI.map.marker(this._map.LatLon(c[1],c[0]),attr).addTo(this._map);
								}else{
									// Update position
									this._json.features[f].marker.setLatLon(this._map.LatLon(c[1],c[0]));
								}
							}else if(g.type=="Polygon"){
								if(!this._json.features[f].svg){
									el = svgEl('path');
									this._svg.appendChild(el);
									this._json.features[f].svg = el;								
								}
								// Make the path
								d = '';
								for(i = 0; i < c.length; i++){
									for(j = 0; j < c[i].length; j++){
										xy = this._map.LatLon(c[i][j][1],c[i][j][0]).toPx(z);
										d += (j==0 ? 'M':'L')+' '+(xy.x-offset.x)+' '+(xy.y-offset.y);
									}
								}
								props.d = d;
								props.fill = true;
							}else if(g.type=="LineString"){
								if(!this._json.features[f].svg){
									el = svgEl('path');
									ODI._setAttr(el,{'r':5,stroke:'black','stroke-width':1,fill:'none'});
									this._svg.appendChild(el);
									this._json.features[f].svg = el;								
								}
								// Make the points
								d = '';
								for(i = 0; i < c.length; i++){
									xy = this._map.LatLon(c[i][1],c[i][0]).toPx(z);
									d += (i==0 ? 'M':'L')+(xy.x-offset.x)+' '+(xy.y-offset.y);
								}
								props.d = d;
								props.fill = false;
							}else if(g.type=="MultiLineString"){
								if(!this._json.features[f].svg){
									el = svgEl('path');
									ODI._setAttr(el,{'r':5,stroke:'black','stroke-width':1,fill:'none'});
									this._svg.appendChild(el);
									this._json.features[f].svg = el;								
								}
								// Make the points
								d = '';
								for(i = 0; i < c.length; i++){
									for(j = 0; j < c[i].length; j++){
										xy = this._map.LatLon(c[i][j][1],c[i][j][0]).toPx(z);
										d += (j==0 ? 'M':'L')+(xy.x-offset.x)+' '+(xy.y-offset.y);
									}
								}
								props.d = d;
								props.fill = false;
							}else if(g.type=="MultiPolygon"){
								if(!this._json.features[f].svg){
									el = svgEl('path');
									this._svg.appendChild(el);
									this._json.features[f].svg = el;								
								}
								// Make the path
								d = '';
								for(i = 0; i < c.length; i++){
									for(j = 0; j < c[i].length; j++){
										if(c[i][j].length != 2){
											for(k = 0; k < c[i][j].length; k++){
												xy = this._map.LatLon(c[i][j][k][1],c[i][j][k][0]).toPx(z);
												d += (k==0 ? 'M':'L')+' '+(xy.x-offset.x)+' '+(xy.y-offset.y);
											}
										}
									}
								}
								props.d = d;
								props.fill = true;
							}
							if(this._json.features[f].svg){
								if(props.fill && !props.fillColor) props.fillColor = props.color+'';
								props = renameProps(props,{'fillColor':'fill','color':'stroke','opacity':'stroke-opacity','fillOpacity':'fill-opacity','weight':'stroke-width'});
								this._json.features[f].svg.innerHTML = (props.title ? '<title>'+props.title+'</title>':'');
								ODI._setAttr(this._json.features[f].svg,props);
							}
							if(!this._init && typeof this._attr.onEachFeature==="function"){
								this._json.features[f]._thing = new Thing(this._json.features[f],this._map);
								this._attr.onEachFeature.call(this,this._json.features[f],this._json.features[f]._thing);
							}
							this._json.features[f]._thing.setPosition();
						}
						this._init = true;
					}
					addTo(m){
						var w,h;
						this._map = m;
						var p = this._attr.pane;
						if(!m.panes.p[p]) return m.log('ERROR','No pane %c'+p+'%c exists.','font-style:italic;','');
						m.panes.p[p].el.appendChild(this._el);
						m.panes.p[p].layers.push(this);
						this.update(this._map.getBounds(),this._map.getZoom());
						w = this._el.offsetWidth;
						h = this._el.offsetHeight;
						ODI._setAttr(this._svg,{'viewBox':('0 0 '+w+' '+h),'width':w,'height':h});

					}
				}
				ODI.map.geoJSON = function(geo,attr){
					if(!attr) attr = {};
					if(!attr.pane) attr.pane = 'overlay';	// default pane
					return new geoJSONLayer(geo,attr);
				};
				ODI.map.marker = function(ll,attr){
					if(!attr) attr = {};
					if(!attr.pane) attr.pane = 'marker';	// default pane
					return new marker(ll,attr);
				};
			}
		});
	}

	root.ODI = ODI;
})(window || this);