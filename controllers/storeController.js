const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    } else {
      next({message: 'That filetype isn\'t allowed!'}, false);
    }
  }
};

exports.homePage = (req, res) => {
  console.log(req.name);
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our file system, keep going!
  next();
};

exports.createStore = async (req, res) => {
  const store = await(new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
  // 1. Query the database for a list of all stores
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
}

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  // 2. confirm they are the owner of the store
  // 3. render out the edit form so the user can update their store
  const store = await Store.findOne({ _id: req.params.id });
  res.render('editStore', { title: `Edit ${store.name}`, store });
}

exports.updateStore = async (req, res) => {
  // 1. set location data to be a Point
  req.body.location.type= 'Point';
  // 2. Find and update the chosen store
  const store = await Store.findOneAndUpdate(
    { _id: req.params.id }
    , req.body
    , { new: true, // return the new store instead of the old one
      runValidators: true
    }
  ).exec();

  // 3. Redirect to store and notify update successful
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store -></a>`);
  res.redirect(`/stores/${store._id}/edit`);
}