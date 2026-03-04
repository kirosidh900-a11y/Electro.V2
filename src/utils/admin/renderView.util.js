const  renderView = (res, view, data) => {
  return new Promise((resolve, reject) => {
    res.render(view, data, (err, html) => {
      if (err) return reject(err);
      resolve(html);
    });
  });
}

export default renderView