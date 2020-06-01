import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { init, locations } from 'contentful-ui-extensions-sdk';
import 'whatwg-fetch';
import './index.css';

var xml2js = require('xml2js');
var moment = require('moment');
var momentDurationFormatSetup = require('moment-duration-format');

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
      movieAvailability:
        this.props.sdk.entry &&
        this.props.sdk.entry.fields &&
        this.props.sdk.entry.fields.movieAvailability
          ? this.props.sdk.entry.fields.movieAvailability.getValue()
          : '',
      moviePicker:
        this.props.sdk.entry &&
        this.props.sdk.entry.fields &&
        this.props.sdk.entry.fields.moviePicker
          ? this.props.sdk.entry.fields.moviePicker.getValue()
          : '',
      error: false,
      isLoading: false,
      searchText: '',
      movies: [],
      images: [],
      searched: false,
      isCustom: false
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

    if (
      this.props.sdk.entry &&
      this.props.sdk.entry.fields &&
      this.props.sdk.entry.fields.movieId
    ) {
      let ID = this.props.sdk.entry.fields.movieId.getValue();
      if (ID) {
        ID = ID.toLowerCase();
        if (ID.includes('custom') || !ID.includes('mv')) {
          this.setState({
            isCustom: true
          });
        }
      }
    }
  }

  onChange = e => {
    this.setState({ searchText: e.target.value });
  };

  // Contentful functions
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

  // Movie search
  openMovieSelect = () => {
    let { connectApiKey, connectApiUrl } = this.props.sdk.parameters.instance;
    this.props.sdk.dialogs
      .openExtension({
        title: 'Add Movie',
        shouldCloseOnOverlayClick: true,
        parameters: { connectApiUrl, connectApiKey, type: 'movie' }
      })
      .then(data => {
        if (data) {
          this.setState({
            selectedMovie: data.program.tmsId
          });
          let details = this.getMovieDetails(data.program.tmsId);
          let stream = this.getMovieStream(data.program.tmsId);

          Promise.all([details, stream]).then(([details, stream]) => {
            this.saveMovie(details, stream, true);
          });
        }
      });
  };

  onMovieSelect = movie => {
    this.props.sdk.close(movie);
  };

  fetchMovies = param => {
    this.setState({
      isLoading: true,
      movies: [],
      searchText: '',
      searched: true
    });
    let { connectApiKey, connectApiUrl } = this.props.sdk.parameters.invocation;
    if (connectApiKey && connectApiUrl) {
      fetch(
        `${connectApiUrl}programs/search/?q=${param}&api_key=${connectApiKey}&imageSize=Ms&limit=25&entityType=movie`
      )
        .then(res => res.json())
        .then(
          data => {
            // console.log(data);
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

  getMovieDetails = async tmsId => {
    let { connectApiKey, connectApiUrl } = this.props.sdk.parameters.instance;

    if (connectApiKey && connectApiUrl && tmsId) {
      var details = await fetch(`${connectApiUrl}programs/${tmsId}?api_key=${connectApiKey}`)
        .then(res => res.json())
        .then(data => {
          return data;
        })
        .catch(err => {
          console.log('Error fetching program details: ', err);
        });
    }
    return details;
  };

  getMovieStream = async tmsId => {
    let { onApiKey, onApiUrl } = this.props.sdk.parameters.instance;

    if (onApiKey && onApiUrl && tmsId) {
      var stream = await fetch(
        `${onApiUrl}ProgramAvailabilities?api_key=${onApiKey}&tmsId=${tmsId}`
      )
        .then(res => res.text())
        .then(data => {
          return xml2js
            .parseStringPromise(data)
            .then(result => {
              // console.log(result);
              return this.parseMovieStream(result);
            })
            .catch(err => {
              console.log('Error parsing xml to json: ', err);
            });
        })
        .catch(err => {
          console.log('Error fetching program availabilities: ', err);
        });
      return stream;
    }
  };

  parseMovieStream = data => {
    var movies = [];
    let providers = [];
    let parsed = [];
    if (
      data &&
      data.on &&
      data.on.programAvailabilities &&
      data.on.programAvailabilities.length > 0 &&
      data.on.programAvailabilities[0].programAvailability.length > 0
    ) {
      // console.log(data.on.programAvailabilities[0].programAvailability);
      data.on.programAvailabilities[0].programAvailability.map(provider => {
        const { catalogName, urls, videoQuality, viewingOptions } = provider;
        let urlArr = [];
        let licenseArr = [];

        // Get streaming URLS
        if (urls && urls.length > 0 && urls[0].url && urls[0].url.length > 0) {
          urlArr = urls[0].url.map(url => {
            return url['_'];
          });
        }
        // Remove duplicates in URL
        urlArr = [...new Set(urlArr)];

        // Get licenses and prices
        if (
          viewingOptions &&
          viewingOptions.length > 0 &&
          viewingOptions[0].viewingOption &&
          viewingOptions[0].viewingOption.length > 0
        ) {
          licenseArr = viewingOptions[0].viewingOption
            .map(license => {
              return {
                license:
                  license.license && license.license.length > 0
                    ? license.license.join('')
                    : undefined,
                price:
                  license.price && license.price.length > 0 ? license.price[0]['_'] : undefined,
                quality:
                  videoQuality && videoQuality.length > 0 ? videoQuality.join('') : videoQuality,
                urls: urlArr
              };
            })
            .sort((a, b) => {
              return a.price - b.price;
            });
        }
        let movie = {
          provider: catalogName && catalogName.length > 0 ? catalogName.join('') : catalogName,
          data: licenseArr
        };
        movies.push(movie);
      });
      // console.log(movies);

      for (let i = 0; i < movies.length; i++) {
        if (providers.indexOf(movies[i].provider) === -1) {
          providers.push(movies[i].provider);
          parsed.push(movies[i]);
        } else {
          for (let x = 0; x < parsed.length; x++) {
            if (parsed[x].provider === movies[i].provider) {
              parsed[x].data.push(...movies[i].data);
            }
          }
        }
      }
      return parsed;
    }
  };

  refreshData = async tmsId => {
    // console.log(tmsId);
    let details = this.getMovieDetails(tmsId);
    let stream = this.getMovieStream(tmsId);

    Promise.all([details, stream]).then(([details, stream]) => {
      this.saveMovie(details, stream, true);
    });
  };

  saveMovie = async (movie, stream, imagePopup = false) => {
    // console.log(movie);
    // console.log(stream);
    this.props.sdk.entry.fields.tags.removeValue();
    this.props.sdk.entry.fields.genre.removeValue();
    this.props.sdk.entry.fields.image.getValue();

    if (movie) {
      this.setState({
        moviePicker: movie
      });
      let directors = movie.directors.length > 0 ? movie.directors.join(', ') : '';
      let topCast =
        movie.cast.length > 0
          ? movie.cast.reduce((accum, cast, i) => {
              if (i < 3) {
                accum.push(cast.name);
              }
              return accum;
            }, [])
          : '';
      let duration = moment.duration(movie.runTime, 'minutes').format('mm');
      let rating =
        movie.ratings && movie.ratings.length > 0 && movie.ratings[0].code
          ? movie.ratings[0].code
          : '';
      let tags = movie.keywords ? Object.values(movie.keywords).flat() : [];

      this.props.sdk.entry.fields.moviePicker.setValue(movie);
      this.props.sdk.entry.fields.title.setValue(movie.title);
      this.props.sdk.entry.fields.adminTitle.setValue(movie.title);
      this.props.sdk.entry.fields.description.setValue(movie.longDescription);
      this.props.sdk.entry.fields.releaseDate.setValue(movie.releaseDate);
      this.props.sdk.entry.fields.movieId.setValue(movie.tmsId);
      this.props.sdk.entry.fields.logLine.setValue(movie.shortDescription);
      this.props.sdk.entry.fields.directors.setValue(directors);
      this.props.sdk.entry.fields.topCast.setValue(topCast.join(', '));
      this.props.sdk.entry.fields.runTime.setValue(duration);
      this.props.sdk.entry.fields.genre.setValue(movie.genres);
      this.props.sdk.entry.fields.rating.setValue(rating);
      this.props.sdk.entry.fields.tags.setValue(tags);
      if (stream) {
        this.props.sdk.entry.fields.movieAvailability.setValue(stream);
        this.setState({
          movieAvailability: stream
        });
      }
      const rawAsset = await this.createAssetWithImageUrl(
        movie.preferredImage.uri,
        '',
        this.props.sdk.locales.default,
        movie.title
      );
      this.processAndPublishPoster(rawAsset, this.props.sdk.locales.default);
      this.props.sdk.notifier.success('Movie successfully saved!');
      if (imagePopup) {
        this.openImageSelect();
      }
      this.props.sdk.window.updateHeight(500);
    }
  };

  // Image search

  openImageSelect = () => {
    let { connectApiKey, connectApiUrl } = this.props.sdk.parameters.instance;
    this.props.sdk.dialogs
      .openExtension({
        title: 'Select Image',
        shouldCloseOnOverlayClick: true,
        parameters: {
          connectApiUrl,
          connectApiKey,
          type: 'image',
          movieId: this.state.selectedMovie
        }
      })
      .then(data => {
        if (data) {
          this.saveImage(data);
        }
      });
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

  onImageSelect = image => {
    this.props.sdk.close(image);
  };

  fetchPictures = movieID => {
    this.setState({
      isLoading: true
    });
    let { connectApiUrl, connectApiKey } = this.props.sdk.parameters.invocation;
    if (connectApiKey && connectApiUrl) {
      fetch(`${connectApiUrl}programs/${movieID}/images?api_key=${connectApiKey}`)
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

  render() {
    // console.log(this.state.movies);
    // Create master array of search results
    if (this.state.movies.length > 0) {
      var movies = this.state.movies.map(movie => {
        let duration = moment.duration(movie.program.runTime, 'minutes').format('mm');
        return (
          <div
            key={movie.program.tsmId}
            className="movie-thumbnail"
            onClick={this.onMovieSelect.bind(this, movie)}>
            <div className="poster-image">
              <img src={movie.program.preferredImage.uri} />
            </div>
            <div className="details">
              <div className="title">{movie.program.title}</div>
              <div className="year">
                {duration && <span className="year">{duration} MIN</span>}
                {movie.program.ratings && movie.program.ratings.length > 0 && (
                  <span className="year">&nbsp;|&nbsp;{movie.program.ratings[0].code}</span>
                )}
                {movie.program.releaseYear && (
                  <span className="year">&nbsp;|&nbsp;{movie.program.releaseYear}</span>
                )}
              </div>
              <div className="description">{movie.program.shortDescription}</div>
              <div className="lang">Title Language: {movie.program.titleLang.toUpperCase()}</div>
              <div className="lang">
                Description Language: {movie.program.descriptionLang.toUpperCase()}
              </div>
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
            <div key={i} className="image-ctn" onClick={this.onImageSelect.bind(this, image)}>
              <div className="movie-image">
                <img src={image.uri} />
              </div>
              <div className="details">
                <div className="description">
                  {image.category}&nbsp;&#183;&nbsp;{image.aspect}&nbsp;&#183;&nbsp;{image.width} x{' '}
                  {image.height}
                </div>
              </div>
            </div>
          );
        }
      });
    }

    if (this.state.movieAvailability && this.state.movieAvailability.length > 0) {
      // console.log(this.state.movieAvailability);
      var streamData = this.state.movieAvailability.map((provider, i) => {
        let data = undefined;
        let price = undefined;
        let quality = undefined;

        if (provider.data) {
          data = provider.data.sort((a, b) => {
            if (a.data && b.data) {
              return a.data - b.data;
            }
          });
          price = data.length > 0 && data[0].price ? data[0].price : 'SUBSCRIPTION';
          quality = provider.data.map(provider => {
            return provider.quality;
          });
          quality = [...new Set(quality)].join(', ');
        }
        let link =
          provider.data && provider.data[0] && provider.data[0].urls && provider.data[0].urls[0]
            ? provider.data[0].urls[0]
            : null;
        let imageLink = undefined;
        let providerTemp = provider.provider.replace(/[^a-zA-Z ]/g, '').toLowerCase();
        if (providerTemp.includes('netflix')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/4YFQdcYU5R2fdqTxu2W2QY/9d37ca7da819598bdee2acca3cbe7443/netflix.png';
        } else if (providerTemp.includes('hulu')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/7gRzHIFlA13XbvZ8UNXDDm/000d0618e948f71ee15e95bf2592b3d9/hulu.png';
        } else if (providerTemp.includes('disney')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/4ChfTvLZKtuDeIf0L0qagG/4b330b4b905d1a147f27d0720452fb4d/disney.png';
        } else if (providerTemp.includes('vudu')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5EowU0JzbCuLDNyr7d5IHr/cdd93ecf826d0418a2e6db721c7afb3d/vudu.png';
        } else if (providerTemp.includes('youtube')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5gVXZqOPkvWmnHvrAvj1xW/a0a32f521fc5dc37b06f235253ba1b37/youtube.png';
        } else if (providerTemp.includes('amazon')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/4YFQdcYU5R2fdqTxu2W2QY/9d37ca7da819598bdee2acca3cbe7443/amazon.png';
        } else if (providerTemp.includes('itunes')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/74ZB2EY6sN0KNH2EujEZDB/2d4707f2f489a1f2f477b86a324befc6/itunes.png';
        } else if (providerTemp.includes('hbo') && providerTemp.includes('go')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5RJ7YS18VMv6WA7Ug2eDCH/16dba9775ee685431947ab172a643090/hbogo.png';
        } else if (providerTemp.includes('hbo')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/1ZynsjGxKb9wjuxuqFHi8I/35cbc5b0ad3039d3595df0b8ed41656c/hbo.png';
        } else if (providerTemp.includes('starz')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/45FvBtZSguSEdVEd5f1ERS/5788c06f88c35578e7be4c8b9f9c574e/starz.png';
        }

        // console.log(quality !== '');
        return (
          <div key={i} className="provider">
            <a href={link} target="_blank">
              <img className="provider-icon" src={imageLink} />
              <div className="provider-details">
                <div className="provider-title">{provider.provider}</div>
                {price === 'SUBSCRIPTION' ? (
                  <div className="provider-info">
                    {quality !== '' ? `${price}, ${quality}` : price}
                  </div>
                ) : (
                  <div className="provider-info">
                    {quality !== '' ? `FROM $${price}, ${quality}` : `FROM $${price}`}
                  </div>
                )}
              </div>
            </a>
          </div>
        );
      });
    }

    if (this.props.sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
      let selectedMovieObj = this.state.moviePicker;
      let duration = '';
      if (selectedMovieObj && selectedMovieObj.runTime) {
        duration = moment.duration(selectedMovieObj.runTime, 'minutes').format('mm');
      }

      return (
        <div className="ctn">
          <button className="add-button" onClick={this.openMovieSelect}>
            <i className="fas fa-plus"></i> Add Movie
          </button>
          {/* <button className="add-button" onClick={this.openMovieSelect}>
            <i className="fas fa-plus"></i> Add Custom
          </button> */}
          {this.state.selectedMovie && !this.state.isCustom && (
            <button className="add-button" onClick={this.openImageSelect}>
              <i className="fas fa-images"></i> Select Image
            </button>
          )}
          {this.state.selectedMovie && !this.state.isCustom && (
            <button
              className="add-button"
              onClick={this.refreshData.bind(this, this.state.selectedMovie)}>
              <i className="fas fa-sync"></i> Reset Data
            </button>
          )}
          {this.state.isCustom && <div className="custom-title">Note: This is a custom movie.</div>}
          {this.state.moviePicker && (
            <>
              <div className="movie-selected-title">Selected Movie</div>
              <div className="movie-selected">
                <div className="poster-image">
                  <img src={selectedMovieObj.preferredImage.uri} />
                </div>
                <div className="details">
                  <div className="title">{selectedMovieObj.title}</div>
                  <div className="year">
                    {duration && <span className="year">{duration} MIN</span>}
                    {selectedMovieObj.ratings && selectedMovieObj.ratings.length > 0 && (
                      <span className="year">&nbsp;|&nbsp;{selectedMovieObj.ratings[0].code}</span>
                    )}
                    {selectedMovieObj.releaseYear && (
                      <span className="year">&nbsp;|&nbsp;{selectedMovieObj.releaseYear}</span>
                    )}
                  </div>
                  <div className="description">{selectedMovieObj.shortDescription}</div>
                  <div className="lang">
                    Title Language: {selectedMovieObj.titleLang.toUpperCase()}
                  </div>
                  <div className="lang">
                    Description Language: {selectedMovieObj.descriptionLang.toUpperCase()}
                  </div>
                </div>
              </div>
            </>
          )}
          {streamData && (
            <>
              <div className="movie-selected-title">Movie Availability</div>
              <div className="provider-ctn">{streamData}</div>
            </>
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
              placeholder="Search Movie..."
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
              <i className="fas fa-search"></i> Search
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
          {images && images.length > 0 && !this.state.isLoading ? (
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
