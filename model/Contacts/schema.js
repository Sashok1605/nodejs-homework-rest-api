const mongoose = require('../../db')

const Shema = mongoose.Schema;

const contacts = new Shema({
  name: {
    type: String,
    required: [true, "Set name for contact"],
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: mongoose.ObjectId,
    ref: "user",
  },
});

const Contact = mongoose.model(`contact`, contacts);

module.exports = Contact;