var itemHash = {};

for (var i = 0; i < dependencies.length; i++) {
	var itemPair = dependencies[i];
	var ingredient = itemPair[0];
	var product = itemPair[1];
	itemHash[ingredient] = itemHash[ingredient] || {};

	itemHash[ingredient].products = itemHash[ingredient].products || [];

	itemHash[ingredient].products.push({
		name: product
	});
}

var recipeHash = {};

for (var i = 0; i < recipes.length; i++) {
	var recipe = recipes[i];

	var result = recipe.result.name;
	recipeHash[result] = recipeHash[result] || {};

	recipeHash[result].recipes = recipeHash[result].recipes || [];

	recipeHash[result].recipes.push({
		count: recipe.result.count,
		ingredients: recipe.ingredients,
		version: null
	});
}

var items = Object.keys(itemHash);

function searchTerm(name) {
	var match = items.filter(function(d) {
		return d.toLowerCase().indexOf(name.toLowerCase()) > -1;
	});
}


function buildTree(itemName) {
	var match = itemHash[itemName];
	if (match) {
		var products = match.products;
		var tree = {};
		tree.name = itemName;
		tree.depth = 0;
		tree.children = getChildren(tree, products, 0);
		return tree;
	}

	return null;
}

function buildRecipeTree(recipeName) {
	var match = recipeHash[recipeName];
	if (match) {
		var recipe = match.recipes[0];
		var tree = {};
		tree.name = recipeName;
		tree.depth = 0;
		tree.count = recipe.count;
		tree.children = getRecipeChildren(tree, recipe.ingredients, 0);
		return tree;

	}
	return null;
}

function getRecipeChildren(n, ingredients, depth, recipeIndex) {
	var nodes = [];

	for (var i = 0; i < ingredients.length; i++) {
		var ingredient = ingredients[i];
		var node = {};
		node.depth = depth + 1;
		node.name = ingredient.name;
		node.count = ingredient.count;
		node.cost = node.count * n.count;
		node.recipeIndex = recipeIndex || 0;
		node.parentName = n.name;
		var match = recipeHash[node.name];
		if (node.name !== n.parentName) {

			if (match) {
				node.children = [];
				for (var j = 0; j < match.recipes.length; j++) {
					var recipe = match.recipes[j];
					node.children = node.children.concat(getRecipeChildren(node, recipe.ingredients, depth + 1, j));
				}
			}

			//node.children = match ? getRecipeChildren(node, match.recipes[0].ingredients, depth + 1) : null;
			nodes.push(node);
		}
	}
	return nodes;
}


function getChildren(n, products, d) {
	var nodes = [];

	for (var i = 0; i < products.length; i++) {
		var product = products[i];
		var node = {};
		node.depth = d + 1;
		node.name = product.name;
		node.parentName = n.name;
		var item = itemHash[node.name];

		if (node.name !== n.parentName) {
			node.children = item ? getChildren(node, item.products, d + 1) : null;
			nodes.push(node);
		}

	}
	return nodes;
}


function Tree(elem, data, options) {
	this.element = elem;
	this.data = data;
	this.options = options || {};

	var buffer = 20,
		width = 900,
		height = 700;

	this.svg = d3.select(elem).append('svg');
	this.svg
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'tree-graph');

	this.plotGroup = this.svg
		.append("g");
	//.attr("transform", "translate(" + 400 / 2 + "," + 800 / 2 + ")");

	this.margin = {
		top: buffer,
		bottom: buffer,
		left: buffer * 6,
		right: buffer * 10
	};

	this.plotArea = {
		left: this.margin.left,
		top: this.margin.top,
		right: width - this.margin.right,
		bottom: height - this.margin.bottom,
		width: width - this.margin.left - this.margin.right,
		height: height - this.margin.top - this.margin.bottom
	};

	this.onNodeClick = function() {

	}

	this.update();
}

Tree.prototype.update = function(data) {
	var tree = d3.layout.tree()
		.size([this.plotArea.height, this.plotArea.width]);

	var t = this;

	var dx = this.plotArea.left; //t.plotArea.width / 10;
	var dy = 0; //t.plotArea.height / 10;

	var diagonal = d3.svg.diagonal()
		.projection(function(d) {
			return !t.options.invert ? [d.y + dx, d.x + dy] : [t.plotArea.right - d.y, d.x + dy];
		});

	this.data = data || this.data;

	var nodes = tree.nodes(this.data),
		links = tree.links(nodes);

	var link = this.plotGroup.selectAll('path.link').data(links);

	link.enter()
		.append('path')
		.attr('class', 'link');

	this.recipeColors = {};
	this.recipeColors[0] = 'black';
	this.recipeColors[undefined] = 'black';

	link.transition()
		.attr('d', diagonal)
		.attr('stroke', function(d) {
			t.recipeColors[d.target.recipeIndex] = t.recipeColors[d.target.recipeIndex] || 'hsl(' + (Math.random() * 360) + ',100%,50%)';
			return t.recipeColors[d.target.recipeIndex];
		});

	link.exit().remove();

	var node = this.plotGroup.selectAll("g.node")
		.data(nodes);
	node.enter().append("g")
		.attr("class", "node");

	node
		.transition()
		.attr("transform", function(d) {
			return t.options.invert ?
				"translate(" + (t.plotArea.right - d.y) + "," + (d.x + dy) + ")" : "translate(" + (d.y + dx) + "," + (d.x + dy) + ")"
		});

	node.exit().remove();

	node.selectAll("*").remove();

	node.append("circle")
		.attr('class', 'node')
		.attr("r", 4.5);

	node.append("text")
		.attr('class', 'item-name')
		.attr("dy", function(d) {
			return d.children ? "-0em" : '0em';
		})
		.attr("dx", function(d) {

			if (t.options.invert) {
				return d.children ? 0.75 + 'em' : -0.75 + 'em';
			} else {
				return d.children ? -0.75 + 'em' : 0.75 + 'em';
			}
		})
		.attr("text-anchor", function(d) {
			if (!t.options.invert) {
				return d.children ? "end" : 'start';
				if (d.depth == 0) return 'end';
			} else {
				return d.children ? 'start' : 'end';
			}
		})
		.attr('alignment-baseline', 'middle')
		.text(function(d) {
			return d.name;
		});

	node.append("text")
		.attr('class', 'item-cost')
		.attr("dy", function(d) {
			return '1.1em';
		})
		.attr("dx", function(d) {

			if (t.options.invert) {
				return d.children ? 0.75 + 'em' : -0.75 + 'em';
			} else {
				return d.children ? -0.75 + 'em' : 0.75 + 'em';
			}

		})
		.attr("text-anchor", function(d) {
			if (!t.options.invert) {
				return d.children ? "end" : 'start';
				if (d.depth == 0) return 'end';
			} else {
				return d.children ? 'start' : 'end';
			}
		})
		.attr('alignment-baseline', 'middle')
		.text(function(d) {
			return d.cost || d.count || '';
		});

	node.on('click', function(d) {
		t.onNodeClick(d);
	});
}