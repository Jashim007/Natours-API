//Controller stores the handler functions of all the routes
const fs = require('fs');
const Tour = require('../models/tourModel');


exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};

exports.topCheapTours = (req, res, next) => {
  req.query.page = 1;
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficult';
  next();
};

exports.getAllTours = async (req, res) => {
  /* 
  Filtering URL 1 : http://127.0.0.1:3000/api/v1/tours?price=397&name=Jashim Demo Data&limit=9
  If you want to include > , < , >= , <= in your filtering then your URL will be like  
  Filtering URL 2 : http://127.0.0.1:3000/api/v1/tours?price=397&duration[gte]=5
  The above URL filters results having duration which are greater than and equals to 5
  The query string that comes from request object looks like
  { price:397 , duration:{ gte:5 } }
  The corresponding MongoDB query for the above URL will be like
  { price:397 , duration:{ $gte:5 } }
  So we have to add an extra $ before the words : gt, gte, lt, lte
  So that both the above query strings match.
  */
  try {
    let queryString = null;

    if (Object.keys(req.query).length > 0) {
      let queryObj = { ...req.query };
      // creating a deep copy of the request query so that the actual query does not get modified while filtering data.

      //Normal Filtering
      const excludedParams = ['page', 'sort', 'limit', 'fields']; //we want to filter these keywords from the params mentioned for filtering data.

      excludedParams.forEach((el) => delete queryObj[el]); // Filtering URL 1 done

      //Advanced Filtering
      queryString = JSON.stringify(queryObj);
      queryString = queryString.replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`
      );
      queryString = JSON.parse(queryString);
    }

    let allTour = Tour.find(queryString);

    //Sorting
    //single field ascending order sorting: http://127.0.0.1:3000/api/v1/tours?duration[gt]=5&sort=price
    //single field descending order sorting: http://127.0.0.1:3000/api/v1/tours?duration[gt]=5&sort=-price
    //Multiple field ascending order sorting: http://127.0.0.1:3000/api/v1/tours?duration[gt]=5&sort=price,rating

    /* If you want to sort based on multiple params then specify the multiple params separated by spaces.
    The .sort() method in mongoose takes an "MongoDB query object" as an argument, where keys are field names, and values are either 1 for ascending order or -1 for descending order and sorts that object.
    */

    if (req.query.sort) {
      let multipleSortParams = req.query.sort.split(',').join(' ');
      console.log(multipleSortParams);
      allTour = allTour.sort(multipleSortParams);
    } else {
      allTour = allTour.sort('-createdAt');
    }
    //Field Limiting
    /* 
    If you want to select specific fields only then use the select() function of mongoose. For selecting multiple fields you need to specify the fields separated by spaces.
    URL: http://127.0.0.1:3000/api/v1/tours?fields=price,summary 
    */
    if (req.query.fields) {
      let multipleSortParams = req.query.fields.split(',').join(' ');
      console.log(multipleSortParams);
      allTour = allTour.select(multipleSortParams);
    } else {
      allTour = allTour.select('-__v'); // we do not want to include __v as it is a mongodb specific field.
    }

    //Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    allTour = allTour.skip(skip).limit(limit);

    if (req.query.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('Page not found');
    }

    let allToursResult = await allTour;

    console.log(req.requestTime);
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: allToursResult.length,
      data: {
        allToursResult,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      status: 'error',
      message: error,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    console.log(req.requestTime);
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: {
        tour,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      message: error,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      message: error,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(201).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      message: error,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      message: error,
    });
  }
};
