/**
 * @author gibbs nguyo http://www.gnguyo.com @gneezy
 */

 // A class to parse and display the Tiled Generated json file.
PIXI.Tiled = function(url){
    if(arguments.length != 1){
        throw new Error('No url defined.');
    }

    PIXI.DisplayObjectContainer.call(this);

    this.url = url;

    this.init();
}

// constructor
PIXI.Tiled.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Tiled.prototype.constructor = PIXI.Tiled;

PIXI.Tiled.prototype.init = function(){
    var scope = this;

    // loads the json files. Then loads all the required images. Finally creating the map.
    scope.loadJsonFile(function(){
        scope.loadImages(function(){
            scope.createMap();
        });
    });
}

PIXI.Tiled.prototype.loadJsonFile = function(callback){
    var scope = this;
    var tileMapJson = new PIXI.JsonLoader(this.url, false);
    tileMapJson.onLoaded = function(){
        scope.json = this.json;

        if(callback) callback();
    }
    tileMapJson.load();
}

PIXI.Tiled.prototype.loadImages = function(callback){
    var imageUrls = [];

    for(var i = 0, tiles = this.json.tilesets.length; i < tiles; i++){
        imageUrls.push(this.json.tilesets[i].image);
    }
    
    // create a new loader
    loader = new PIXI.AssetLoader(imageUrls);

    loader.onComplete = function(){
        if(callback) callback();
    };

    loader.load();
}

PIXI.Tiled.prototype.createMap = function(){
    
    // fetch the layers of the map
    var layers = this.json.layers;

    for(var layerPos in layers){
        var layer = layers[layerPos];

        // Check if the layer is visible.. No need to render if its invisible.
        if(!layer.visible  || layer.type != "tilelayer"){
            continue;
        }

        // Create a Display object for current layer.
        var layerMap = new PIXI.DisplayObjectContainer();
        layerMap.position = new PIXI.Point(layer.x, layer.y);
        layerMap.alpha = layer.opacity;

        // Loop each tile.
        for(var height = 0; height < layer.height; height++){
            for(var width = 0; width < layer.width; width++){

                var pos = layer.data[width + height * layer.width];
                if(pos == 0){
                    continue;
                }

                var spriteData = this.getSpriteData(pos);
                var tileset = this.getTilesetFromGid(spriteData.pos);
                var sprite = this.getSprite(spriteData, tileset);

                // scale.
                var scale = this.json.tileheight / tileset.tileheight;
                
                // rotation
                sprite.rotation = spriteData.rotation  * Math.PI / 180;
                if(spriteData.rotation == 0){
                    sprite.anchor.x = 0;
                    sprite.anchor.y = 1 - scale;
                } else if(spriteData.rotation == 90){
                    sprite.anchor.x = 1 - scale;
                    sprite.anchor.y = 1;
                } else if(spriteData.rotation == 180){
                    sprite.anchor.x = 1;
                    sprite.anchor.y = (scale != 1 ? scale : 1);
                } else if(spriteData.rotation == 270){
                    sprite.anchor.x = (scale != 1 ? scale : 1);
                    sprite.anchor.y = 0;
                }
                
                // Position the Sprite in the layer.
                sprite.position.x = this.json.tilewidth * width;
                sprite.position.y = this.json.tileheight * height;


                // Add sprite to layer.
                layerMap.addChild(sprite);
            }
        }

        this.addChild(layerMap);
    }
}

PIXI.Tiled.prototype.getSpriteData = function(dec){
    var out = "", length = 32, rotation;
    while(length--){
        out += (dec >> length ) & 1;
    }
    switch(parseInt(out.slice(0, -29))){
        case 11:
            rotation = 270;
            break;
        case 110:
            rotation =  180;
            break;
        case 101:
            rotation =  90;
            break;
        default:
            rotation =  0;
    }

    return {
        pos: parseInt(out.slice(3), 2),
        rotation: rotation
    };
}

PIXI.Tiled.prototype.getSprite = function(spriteData, tileset){
    var sprite;

    // Get the sprite image.
    try{
        sprite = PIXI.Sprite.fromFrame(spriteData.pos + "_tiled");
    }catch(exception){
        var txture = PIXI.Texture.fromImage(tileset.image);
        var name = spriteData.pos + "_tiled";
        var gid = spriteData.pos - tileset.firstgid;
        var rowSize = tileset.imagewidth / tileset.tilewidth;
        var columnSize = tileset.imageheight / tileset.tileheight;

        texture = PIXI.TextureCache[name] = new PIXI.Texture(txture.baseTexture, {
            x: tileset.tilewidth * (gid % rowSize),
            y: tileset.tileheight * Math.floor(gid / columnSize),
            width: tileset.tilewidth,
            height: tileset.tileheight
        });
        sprite = new PIXI.Sprite(texture);
    }
    return sprite;
}

PIXI.Tiled.prototype.getTilesetFromGid = function(gid){
    for (var i = 0; i < this.json.tilesets.length; i++) {
        var tileset = this.json.tilesets[i];
        if(!this.json.tilesets[i+1] || gid <  this.json.tilesets[i+1].firstgid){
            return tileset;
        }
    }
}