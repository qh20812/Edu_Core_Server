class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Mongoose query object
    this.queryString = queryString; // req.query từ request
  }

  /**
   * Lọc dữ liệu dựa trên query parameters
   */
  filter() {
    const queryObj = { ...this.queryString };
    
    // Loại bỏ các fields đặc biệt không dùng để lọc
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Xử lý các operator cao cấp (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne)\b/g, match => `$${match}`);
    
    const parsedQuery = JSON.parse(queryStr);

    // Xử lý text search cho các trường cụ thể
    if (this.queryString.search) {
      const searchRegex = { $regex: this.queryString.search, $options: 'i' };
      
      // Tùy chỉnh search fields tùy theo model
      if (this.queryString.searchFields) {
        const searchFields = this.queryString.searchFields.split(',');
        parsedQuery.$or = searchFields.map(field => ({
          [field]: searchRegex
        }));
      } else {
        // Default search trong content/title/name
        parsedQuery.$or = [
          { content: searchRegex },
          { title: searchRegex },
          { name: searchRegex },
          { topic: searchRegex }
        ];
      }
    }

    // Xử lý array fields (tags, categories, etc.)
    Object.keys(parsedQuery).forEach(key => {
      if (typeof parsedQuery[key] === 'string' && parsedQuery[key].includes(',')) {
        parsedQuery[key] = { $in: parsedQuery[key].split(',') };
      }
    });

    this.query = this.query.find(parsedQuery);
    return this;
  }

  /**
   * Sắp xếp dữ liệu
   */
  sort() {
    if (this.queryString.sort) {
      // Chuyển đổi từ "field1,field2" thành "field1 field2"
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Sắp xếp mặc định theo thời gian tạo (mới nhất trước)
      this.query = this.query.sort('-created_at');
    }
    return this;
  }

  /**
   * Giới hạn fields trả về
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Loại bỏ __v field mặc định
      this.query = this.query.select('-__v');
    }
    return this;
  }

  /**
   * Phân trang
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Giới hạn limit tối đa để tránh overload
    const maxLimit = 100;
    const finalLimit = limit > maxLimit ? maxLimit : limit;

    this.query = this.query.skip(skip).limit(finalLimit);
    
    // Lưu thông tin pagination để sử dụng sau
    this.pagination = {
      page,
      limit: finalLimit,
      skip
    };
    
    return this;
  }

  /**
   * Populate các relationships
   */
  populate(populateOptions) {
    if (populateOptions) {
      if (Array.isArray(populateOptions)) {
        populateOptions.forEach(option => {
          this.query = this.query.populate(option);
        });
      } else {
        this.query = this.query.populate(populateOptions);
      }
    }
    return this;
  }

  /**
   * Thực thi query và trả về kết quả với metadata
   */
  async execute(Model) {
    // Thực thi query chính
    const docs = await this.query;
    
    // Đếm tổng số documents (không phân trang)
    let countQuery = Model.find();
    
    // Áp dụng cùng filter cho count query
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);
    
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne)\b/g, match => `$${match}`);
    const parsedQuery = JSON.parse(queryStr);
    
    // Xử lý search cho count query
    if (this.queryString.search) {
      const searchRegex = { $regex: this.queryString.search, $options: 'i' };
      if (this.queryString.searchFields) {
        const searchFields = this.queryString.searchFields.split(',');
        parsedQuery.$or = searchFields.map(field => ({
          [field]: searchRegex
        }));
      } else {
        parsedQuery.$or = [
          { content: searchRegex },
          { title: searchRegex },
          { name: searchRegex },
          { topic: searchRegex }
        ];
      }
    }

    // Xử lý array fields cho count query
    Object.keys(parsedQuery).forEach(key => {
      if (typeof parsedQuery[key] === 'string' && parsedQuery[key].includes(',')) {
        parsedQuery[key] = { $in: parsedQuery[key].split(',') };
      }
    });

    const total = await Model.countDocuments(parsedQuery);
    
    // Tính toán pagination metadata
    const pagination = this.pagination || { page: 1, limit: 20 };
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      data: docs,
      pagination: {
        current: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      }
    };
  }

  /**
   * Phương thức đơn giản chỉ trả về documents
   */
  async exec() {
    return await this.query;
  }
}

module.exports = APIFeatures;
