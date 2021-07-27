/**
  ODI Leeds Tiny Slippy Map
  Version 0.1
**/
// jshint esversion: 6
(function(root){
	var ODI = root.ODI || {};
	if(!ODI.ready){
		ODI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	// Define some constants
	var sz = 256;
	var PI = Math.PI;
	var R = 6378137;
	var D2R = PI / 180;
	var R2D = 180 / PI;
	var deg2m = 6371000 * 2 * PI / 360;	// Approximate conversion from degrees of latitude to metres - assumes a spherical Earth which is probably good enough for these purposes.
	var plugins = {};

	function Map(el,attr){
		var title = "ODI Map";
		var version = "0.1";
		this.logging = (location.search.indexOf('debug=true') >= 0);
		this.log = function(){
			// Version 1.1
			if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING"){
				var args = Array.prototype.slice.call(arguments, 0);
				// Build basic result
				var extra = ['%c'+title+' '+version+'%c: '+args[1],'font-weight:bold;',''];
				// If there are extra parameters passed we add them
				if(args.length > 2) extra = extra.concat(args.splice(2));
				if(console && typeof console.log==="function"){
					if(arguments[0] == "ERROR") console.error.apply(null,extra);
					else if(arguments[0] == "WARNING") console.warn.apply(null,extra);
					else if(arguments[0] == "INFO") console.info.apply(null,extra);
					else console.log.apply(null,extra);
				}
			}
			return this;
		};
		if(!el || !el.tagName){
			this.log('WARNING','No DOM element provided');
			return this;
		}
		if(!attr) attr = {};
		if(!attr.center) attr.center = [0,0];
		if(typeof attr.maxZoom!=="number") attr.maxZoom = 19;
		if(typeof attr.scrollWheelZoom!=="boolean") attr.scrollWheelZoom = true;
		if(typeof attr.zoomControl!=="boolean") attr.zoomControl = true;
		if(typeof attr.attributionControl!=="boolean") attr.attributionControl = true;
		var center,zoom,bounds,p,drag;
		drag = false;
		this.panes = {'el':document.createElement('div'),'p':{'tile':{},'overlay':{},'marker':{},'labels':{}}};
		this.controls = {};

		this.addPane = function(p){
			if(!this.panes.p[p] || !this.panes.p[p].el){
				var pane = document.createElement('div');
				pane.classList.add('odi-map-pane','odi-map-pane-'+p);
				this.panes.p[p] = {'el':pane,'layers':[]};
				add(pane,this.panes.el);
			}
			return this;
		};
		this.tileLayer = function(url,attr){
			if(!attr.pane) attr.pane = 'tile';	// default pane
			return new TileLayer(url,attr);
		};
		this.updateLayers = function(bounds,zoom){
			if(typeof zoom!=="number") zoom = this.getZoom();
			if(!bounds) bounds = this.getBounds();

			var p,l,pos,a;
			pos = {x:0,y:0};
			var attr = '';
			for(p in this.panes.p){
				if(this.panes.p[p]){
					for(l in this.panes.p[p].layers){
						if(this.panes.p[p].layers[l]){
							this.panes.p[p].layers[l].update(bounds,zoom);
							a = this.panes.p[p].layers[l]._attr.attribution;
							if(attr.indexOf(a)<0) attr += a;
						}
					}
				}
			}
			if(this.controls.credit) this.controls.credit.innerHTML = attr+' | '+title;
			return this;
		};
		this.getZoom = function(){ return zoom; };
		this.setZoom = function(z,update){
			zoom = Math.min(z,attr.maxZoom);
			bounds = this.getBounds();
			this.updateLayers(bounds,zoom);
			return this;
		};
		this.zoomIn = function(n){ return this.setZoom(zoom+n); };
		this.zoomOut = function(n){ return this.setZoom(zoom-n); };
		this.getCenter = function(){ return center; };
		this.getBounds = function(){
			var dy,dx,tile;
			dy = el.offsetHeight/(2*sz);
			dx = el.offsetWidth/(2*sz);
			tile = center.toTile(zoom);
			return Bounds(Tile(tile.x-dx,tile.y+dy).toLatLon(zoom),Tile(tile.x+dx,tile.y-dy).toLatLon(zoom));
		};
		this.fitBounds = function(b){
			var dy,dx,z,nw,se,dlat,dlon,tcen;
			bounds = (!b) ? this.getBounds() : Bounds({'lat':b[0][0],'lon':b[0][1]},{'lat':b[1][0],'lon':b[1][1]});
			center = bounds.getCenter();

			dy = el.offsetHeight/(2*sz);
			dx = el.offsetWidth/(2*sz);
			for(z = 0; z < 19; z++){
				tcen = center.toTile(z);
				nw = Tile(tcen.x-dx,tcen.y-dy).toLatLon(z);
				se = Tile(tcen.x+dx,tcen.y+dy).toLatLon(z);
				dlat = bounds.nw.lat-nw.lat;
				dlon = nw.lon-bounds.nw.lon;
				if(dlat >= 0 && dlon >= 0) break;
			}
			this.setZoom(z,false);
			return this;
		};
		this.panBy = function(p,attr){
			if(!attr) attr = {'animate':false,duration:0.25};
			center = center.toTile(zoom).shift(p).toLatLon(zoom);
			this.updateLayers();
		};
		this.addControl = function(name,cls,html){
			if(!this.controls[name]){
				this.controls[name] = document.createElement('div');
				add(this.controls[name],el);
			}
			this.controls[name].classList.add(...cls.split(/ /));
			if(html) this.controls[name].innerHTML = html;
			return this.controls[name];
		};

		center = LatLon(attr.center[0],attr.center[1]);

		// Set the default zoom level
		this.setZoom(attr.zoom||12);

		// Add style to map
		el.classList.add('odi-map');
		this.panes.el.classList.add('odi-map-panes');
		add(this.panes.el,el);

		// Add attribution
		if(attr.attributionControl) this.addControl('credit','odi-map-control odi-map-attribution odi-map-bottom odi-map-right','');
		if(attr.zoomControl){
			this.addControl('zoom','odi-map-control odi-map-zoom odi-map-top odi-map-left','<button class="odi-map-zoom-in" title="Zoom in">+</button><button class="odi-map-zoom-out" title="Zoom out">−</button>');
			addEvent('click',this.controls.zoom.querySelector('.odi-map-zoom-in'),{this:this},function(e){ this.zoomIn(1); });
			addEvent('click',this.controls.zoom.querySelector('.odi-map-zoom-out'),{this:this},function(e){ this.zoomOut(1); });
		}
		// Build panes
		for(p in this.panes.p){
			if(this.panes.p[p]) this.addPane(p);
		}

		// Update layers on resize
		var resizeO = new ResizeObserver(entries => { this.updateLayers(); });
		resizeO.observe(this.panes.el);

		var startdrag = {};
		// Add events
		this.trigger = function(e){
			var ev = e.type;
			if(ev=="pointerdown" && !drag){
				e.preventDefault();
				drag = true;
				startdrag = {x:e.clientX,y:e.clientY};
			}else if(ev=="pointerup"){
				drag = false;
				e.preventDefault();
			}else if(ev=="pointermove" && drag){
				var delta = {x:startdrag.x - e.clientX,y:startdrag.y - e.clientY};
				this.panBy(delta);
				startdrag = {x:e.clientX,y:e.clientY};
			}else if(ev=="wheel" && attr.scrollWheelZoom){
				e.preventDefault();
				e.wheel = e.deltaY ? -e.deltaY : e.wheelDelta/40;
				this.setZoom(zoom+(e.wheel >= 0 ? 1 : -1));
			}
		};

		addEvent('wheel',this.panes.el,{this:this,p:p},this.trigger);
		addEvent('click',this.panes.el,{this:this,p:p},this.trigger);
		addEvent('pointerdown',this.panes.el,{this:this,p:p},this.trigger);
		addEvent('pointerup',this.panes.el,{this:this,p:p},this.trigger);
		addEvent('pointermove',this.panes.el,{this:this,p:p},this.trigger);
		addEvent('drag',this.panes.el,{this:this,p:p},this.trigger);

		this.Layer = Layer;
		this.Bounds = Bounds;
		this.LatLon = LatLon;
		this.Tile = Tile;
		// Execute plugins
		for(p in plugins){
			if(plugins[p]) plugins[p].exec(this);
		}
		return this;
	}
	Map.prototype.register = function(name,p){
		if(plugins[name]) this.log('WARNING','Plugin '+name+' already exists');
		if(typeof p.exec==="function") plugins[name] = p;
		return this;
	};
	class bound {
		constructor(a,b){
			this.nw = LatLon(Math.max(a.lat,b.lat),Math.min(a.lon,b.lon));
			this.se = LatLon(Math.min(a.lat,b.lat),Math.max(a.lon,b.lon));
		}
		getCenter(){ return LatLon((this.nw.lat-this.se.lat)/2 + this.se.lat, (this.se.lon-this.nw.lon)/2 + this.nw.lon); }
	}
	class ll {
		constructor(lat,lon){
			this.lat = lat;
			this.lon = lon;
		}
		toTile(z){
			var x = ((this.lon+180)/360*Math.pow(2,z));
			var y = ((1-Math.log(Math.tan(this.lat*PI/180) + 1/Math.cos(this.lat*PI/180))/PI)/2 *Math.pow(2,z));
			return Tile(x,y);
		}
	}
	class tile {
		constructor(x,y){
			this.x = x;
			this.y = y;
			this.xint = Math.floor(this.x);
			this.yint = Math.floor(this.y);
			return this;
		}
		shift(p){
			this.x += p.x/sz;
			this.y += p.y/sz;
			this.xint = Math.floor(this.x);
			this.yint = Math.floor(this.y);
			return this;
		}
		toLatLon(z){
			var n = PI-2*PI*this.y/Math.pow(2,z);
			return LatLon((180/PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))),(this.x/Math.pow(2,z)*360-180));
		}
		getTranslate(offset){ if(!offset) offset = {x:0,y:0}; return 'translate3d('+((this.x-offset.x)*sz)+'px,'+((this.y-offset.y)*sz)+'px,0)'; }
	}
	function LatLon(lat,lon){ return new ll(lat||0,lon||0); }
	function Bounds(a,b){ return new bound(a||LatLon(),b||LatLon()); }
	function Tile(x,y){ return new tile(x||0,y||0); }
	class Layer {
		constructor(attr,pane){
			this._attr = attr || {};
			this._el = document.createElement('div');
			this._el.classList.add('odi-map-layer');
			return this;
		}
		addTo(m){
			this._map = m;
			var p = this._attr.pane;
			if(!m.panes.p[p]) return m.log('ERROR','No pane %c'+p+'%c exists.','font-style:italic;','');
			m.panes.p[p].el.appendChild(this._el);
			m.panes.p[p].layers.push(this);
			this.update(this._map.getBounds(),this._map.getZoom());
			return this;
		}
		update(bounds,z){
			return this;
		}
	}
	class TileLayer extends Layer {
		constructor(url,attr){
			super(attr);
			this._url = url||"";
			this._tiles = {};
		}
		update(bounds,z){
			var urls,n,u,id,offset;
			// Get tile x/y of centre
			offset = bounds.getCenter().toTile(z);
			urls = this.getTiles(bounds,z);
			n = Math.pow(2,z);
			for(u = 0; u < urls.length; u++){
				id = z+'/'+urls[u].tile.x+'/'+urls[u].tile.y;
				if(!this._tiles[id]){
					this._tiles[id] = {el:document.createElement('img'),'tile':urls[u].tile,'z':urls[u].z};
					this._tiles[id].el.classList.add('odi-map-tile');
					setAttr(this._tiles[id].el,{'id':id,'src':urls[u].url});
					this._tiles[id].el.style.width = sz+"px";
					this._tiles[id].el.style.height = sz+"px";
				}
				this._tiles[id].el.style.transform = urls[u].tile.getTranslate(offset);
				add(this._tiles[id].el,this._el);
			}
			for(id in this._tiles){
				if(this._tiles[id].z != z && this._tiles[id].el){
					this._tiles[id].el.parentNode.removeChild(this._tiles[id].el);
					delete this._tiles[id];
				}
			}
			return this;
		}
		// Adapted from: https://gist.github.com/mourner/8825883
		getTiles(bounds,z){
			var min,max,urls,x,y,s,subs,turl;
			if(!this._attr.subdomains) this._attr.subdomains = 'abc';
			subs = this._attr.subdomains.length;
			min = bounds.nw.toTile(z);
			max = bounds.se.toTile(z);
			urls = [];
			for(x = min.xint; x <= max.xint; x++){
				if(subs > 0) s = x%subs;
				for(y = min.yint; y <= max.yint; y++){
					turl = this._url.replace(/\{z\}/g,z).replace(/\{y\}/g,y).replace(/\{x\}/g,x);
					if(subs > 0) turl = turl.replace(/\{s\}/g,this._attr.subdomains[s]);
					urls.push({'url':turl,z:z,'tile':Tile(x,y)});
				}
			}
			return urls;
		}
	}
	function add(el,to){ return to.appendChild(el); }
	function setAttr(el,prop){
		for(var p in prop){
			if(prop[p]) el.setAttribute(p,prop[p]);
		}
		return el;
	}
	function addEvent(ev,el,attr,fn){
		if(el){
			if(!el.length) el = [el];
			if(typeof fn==="function"){
				el.forEach(function(elem){
					elem.addEventListener(ev,function(e){
						e.data = attr;
						fn.call(attr['this']||this,e);
					});
				});
			}
		}
	}
	ODI.map = Map;
	root.ODI = ODI;
})(window || this);
