import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { init, locations } from 'contentful-ui-extensions-sdk';
import 'whatwg-fetch';
import './index.css';

export class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  detachExternalChangeHandler = null;

  constructor(props) {
    super(props);
    this.state = {
      selectedMovie:
        this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.movieId
          ? this.props.sdk.entry.fields.movieId.getValue()
          : '',
      error: false,
      isLoading: false,
      searchText: '',
      movies: [],
      images: [],
      searched: false
    };
  }

  componentDidMount() {
    this.props.sdk.window.startAutoResizer();
    this.props.sdk.parameters.invocation;
    if (
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'image'
    ) {
      this.fetchPictures(this.props.sdk.parameters.invocation.movieId);
    }
  }

  onChange = e => {
    this.setState({ searchText: e.target.value });
  };

  createAssetWithImageUrl = (imageUrl, contentType, locale, title) => {
    const asset = {
      fields: {
        title: {},
        description: {},
        file: {}
      }
    };

    asset.fields.title[locale] = title;
    asset.fields.description[locale] = '';
    asset.fields.file[locale] = {
      contentType,
      fileName: imageUrl,
      upload: imageUrl
    };

    return this.props.sdk.space.createAsset(asset);
  };

  processAndPublishPoster = async (rawAsset, locale) => {
    // Send a request to start processing the asset. This will happen asynchronously.
    await this.props.sdk.space.processAsset(rawAsset, locale);

    // Wait until asset is processed.
    const processedAsset = await this.props.sdk.space.waitUntilAssetProcessed(
      rawAsset.sys.id,
      locale
    );
    // Try to publish the asset
    let publishedAsset;
    try {
      publishedAsset = await this.props.sdk.space.publishAsset(processedAsset);
    } catch (err) {}

    const asset = publishedAsset || processedAsset;

    // Set the value of the reference field as a link to the asset created above
    await this.props.sdk.entry.fields.poster.setValue(
      {
        sys: {
          type: 'Link',
          linkType: 'Asset',
          id: asset.sys.id
        }
      },
      locale
    );
  };

  processAndPublishImage = async (rawAsset, locale) => {
    // Send a request to start processing the asset. This will happen asynchronously.
    await this.props.sdk.space.processAsset(rawAsset, locale);

    // Wait until asset is processed.
    const processedAsset = await this.props.sdk.space.waitUntilAssetProcessed(
      rawAsset.sys.id,
      locale
    );
    // Try to publish the asset
    let publishedAsset;
    try {
      publishedAsset = await this.props.sdk.space.publishAsset(processedAsset);
    } catch (err) {}

    const asset = publishedAsset || processedAsset;

    // Set the value of the reference field as a link to the asset created above
    await this.props.sdk.entry.fields.image.setValue(
      {
        sys: {
          type: 'Link',
          linkType: 'Asset',
          id: asset.sys.id
        }
      },
      locale
    );
  };

  openMovieSelect = () => {
    let { apiKey, apiUrl } = this.props.sdk.parameters.instance;
    this.props.sdk.dialogs
      .openExtension({
        title: 'Add Movie',
        shouldCloseOnOverlayClick: true,
        parameters: { apiUrl, apiKey, type: 'movie' }
      })
      .then(data => {
        if (data) {
          this.setState({
            selectedMovie: data.program.tmsId
          });
          this.saveMovie(data);
        }
      });
  };

  openImageSelect = () => {
    let { apiKey, apiUrl } = this.props.sdk.parameters.instance;
    this.props.sdk.dialogs
      .openExtension({
        title: 'Select Image',
        shouldCloseOnOverlayClick: true,
        parameters: { apiUrl, apiKey, type: 'image', movieId: this.state.selectedMovie }
      })
      .then(data => {
        if (data) {
          this.saveImage(data);
        }
      });
  };

  saveMovie = async movie => {
    // console.log(this.props.sdk.entry.fields);
    // console.log(movie);
    let directors = movie.program.directors.length > 0 ? movie.program.directors.join(', ') : '';
    let topCast = movie.program.topCast.length > 0 ? movie.program.topCast.join(', ') : '';

    this.props.sdk.entry.fields.title.setValue(movie.program.title);
    this.props.sdk.entry.fields.adminTitle.setValue(movie.program.title);
    this.props.sdk.entry.fields.description.setValue(movie.program.longDescription);
    this.props.sdk.entry.fields.releaseDate.setValue(movie.program.releaseDate);
    this.props.sdk.entry.fields.movieId.setValue(movie.program.tmsId);
    this.props.sdk.entry.fields.logLine.setValue(movie.program.shortDescription);
    this.props.sdk.entry.fields.directors.setValue(directors);
    this.props.sdk.entry.fields.topCast.setValue(topCast);

    // this.props.sdk.entry.fields.image.setValue('');
    const rawAsset = await this.createAssetWithImageUrl(
      movie.program.preferredImage.uri,
      '',
      this.props.sdk.locales.default,
      movie.program.title
    );
    this.processAndPublishPoster(rawAsset, this.props.sdk.locales.default);
    this.props.sdk.notifier.success('Movie successfully saved!');
  };

  saveImage = async image => {
    let rawAsset = '';
    if (image.caption && image.caption.content) {
      rawAsset = await this.createAssetWithImageUrl(
        image.uri,
        '',
        this.props.sdk.locales.default,
        image.caption.content
      );
    } else {
      rawAsset = await this.createAssetWithImageUrl(
        image.uri,
        '',
        this.props.sdk.locales.default,
        image.uri
      );
    }
    this.processAndPublishImage(rawAsset, this.props.sdk.locales.default);
    this.props.sdk.notifier.success('Image successfully saved!');
  };

  onMovieSelect = movie => {
    this.props.sdk.close(movie);
  };

  onImageSelect = image => {
    this.props.sdk.close(image);
  };

  fetchPictures = movieID => {
    this.setState({
      isLoading: true
    });
    let { apiKey, apiUrl } = this.props.sdk.parameters.invocation;
    if (apiKey && apiUrl) {
      fetch(`${apiUrl}programs/${movieID}/images?api_key=${apiKey}`)
        .then(res => res.json())
        .then(
          data => {
            this.setState({
              isLoading: false,
              images: data
            });
          },
          error => {
            this.setState({
              isLoading: false,
              error: 'Error: Could not fetch from API'
            });
          }
        );
    } else {
      this.setState({
        isLoading: false,
        error: 'Error: Invalid API URL or API KEY'
      });
    }
  };

  fetchMovies = param => {
    this.setState({
      isLoading: true,
      movies: [],
      searchText: '',
      searched: true
    });
    let { apiKey, apiUrl } = this.props.sdk.parameters.invocation;
    if (apiKey && apiUrl) {
      fetch(
        `${apiUrl}programs/search/?q=${param}&api_key=${apiKey}&imageSize=Ms&limit=25&entityType=movie`
      )
        .then(res => res.json())
        .then(
          data => {
            this.setState({
              isLoading: false,
              movies: data.hits
            });
          },
          error => {
            this.setState({
              isLoading: false,
              error: 'Error: Could not fetch from API'
            });
          }
        );
    } else {
      this.setState({
        isLoading: false,
        error: 'Error: Invalid API URL or API KEY'
      });
    }
  };

  render() {
    // Create master array of search results
    if (this.state.movies.length > 0) {
      var movies = this.state.movies.map(movie => {
        return (
          <div
            key={movie.program.tsmId}
            className="movie-thumbnail"
            onClick={this.onMovieSelect.bind(this, movie)}>
            <img src={movie.program.preferredImage.uri} />
            <div className="movie-details">
              <div className="movie-title">{movie.program.title}</div>
              <div className="movie-year">{movie.program.releaseYear}</div>
            </div>
          </div>
        );
      });
    }

    // Create master array of search results
    if (this.state.images.length > 0) {
      var images = this.state.images.map((image, i) => {
        if (image.aspect === '16x9') {
          return (
            <div key={i} className="movie-thumbnail" onClick={this.onImageSelect.bind(this, image)}>
              <img src={image.uri} />
              <div className="movie-details">
                <div className="movie-title">
                  Image Size: {image.width} x {image.height}
                </div>
                {image.aspect && <div className="movie-title">Aspect Ratio: {image.aspect}</div>}
                <div className="movie-title">Category: {image.category}</div>
              </div>
            </div>
          );
        }
      });
    }

    if (this.props.sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
      return (
        <div>
          <button className="add-button" onClick={this.openMovieSelect}>
            Add Movie
          </button>
          {this.state.selectedMovie && (
            <button className="add-button" onClick={this.openImageSelect}>
              Select Image
            </button>
          )}
        </div>
      );
    } else if (
      this.props.sdk.location.is(locations.LOCATION_DIALOG) &&
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'movie'
    ) {
      return (
        <div className="dialog-container">
          <div className="input-container">
            <input
              className="search-input"
              type="text"
              placeholder="Enter Movie..."
              onChange={this.onChange}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  this.fetchMovies(this.state.searchText);
                }
              }}
              value={this.state.searchText}
            />
            <button
              className="search-button"
              onClick={() => {
                this.fetchMovies(this.state.searchText);
              }}>
              Search
            </button>
          </div>

          <div>
            {this.state.isLoading && (
              <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
                    <stop stopColor="#000000" stopOpacity="0" offset="0%" />
                    <stop stopColor="#000000" stopOpacity=".631" offset="63.146%" />
                    <stop stopColor="#000000" offset="100%" />
                  </linearGradient>
                </defs>
                <g fill="none" fillRule="evenodd">
                  <g transform="translate(1 1)">
                    <path
                      d="M36 18c0-9.94-8.06-18-18-18"
                      id="Oval-2"
                      stroke="url(#a)"
                      strokeWidth="2">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </path>
                    <circle fill="#000000" cx="36" cy="18" r="1">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                </g>
              </svg>
            )}
          </div>
          <div className="movie-container">{movies}</div>
          {this.state.searched && !this.state.isLoading && this.state.movies.length === 0 && (
            <h3>No Movies Found.</h3>
          )}
        </div>
      );
    } else if (
      this.props.sdk.location.is(locations.LOCATION_DIALOG) &&
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'image'
    ) {
      return (
        <div className="dialog-container">
          <div>
            {this.state.isLoading && (
              <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
                    <stop stopColor="#000000" stopOpacity="0" offset="0%" />
                    <stop stopColor="#000000" stopOpacity=".631" offset="63.146%" />
                    <stop stopColor="#000000" offset="100%" />
                  </linearGradient>
                </defs>
                <g fill="none" fillRule="evenodd">
                  <g transform="translate(1 1)">
                    <path
                      d="M36 18c0-9.94-8.06-18-18-18"
                      id="Oval-2"
                      stroke="url(#a)"
                      strokeWidth="2">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </path>
                    <circle fill="#000000" cx="36" cy="18" r="1">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 18 18"
                        to="360 18 18"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                </g>
              </svg>
            )}
          </div>
          {images && images.length > 0 ? (
            <div className="movie-container">{images}</div>
          ) : (
            <h3>No 16x9 images found.</h3>
          )}
        </div>
      );
    }
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
if (module.hot) {
  module.hot.accept();
}
