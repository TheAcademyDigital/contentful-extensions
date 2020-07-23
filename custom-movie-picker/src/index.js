import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { init, locations } from 'contentful-ui-extensions-sdk';
import 'whatwg-fetch';
import './index.css';

var xml2js = require('xml2js');
var moment = require('moment');
var momentDurationFormatSetup = require('moment-duration-format');
import {
  TextInput,
  Button,
  Note,
  Form,
  TextField,
  FieldGroup,
  EntryCard,
  Card,
  Pill
} from '@contentful/forma-36-react-components';
import '@contentful/forma-36-react-components/dist/styles.css';

export class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      movieAvailability:
        this.props.sdk.entry &&
        this.props.sdk.entry.fields &&
        this.props.sdk.entry.fields.movieAvailability
          ? this.props.sdk.entry.fields.movieAvailability.getValue()
          : '',
      selectedMovie: {
        ...(this.props.sdk.entry &&
        this.props.sdk.entry.fields &&
        this.props.sdk.entry.fields.moviePicker
          ? this.props.sdk.entry.fields.moviePicker.getValue()
          : '')
      },
      tmsId:
        this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.movieId
          ? this.props.sdk.entry.fields.movieId.getValue()
          : '',
      isCustom: false,
      customMovie: {
        title:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.title
            ? this.props.sdk.entry.fields.title.getValue()
            : '',
        description:
          this.props.sdk.entry &&
          this.props.sdk.entry.fields &&
          this.props.sdk.entry.fields.description
            ? this.props.sdk.entry.fields.description.getValue()
            : '',
        logLine:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.logLine
            ? this.props.sdk.entry.fields.logLine.getValue()
            : '',
        directors:
          this.props.sdk.entry &&
          this.props.sdk.entry.fields &&
          this.props.sdk.entry.fields.directors
            ? this.props.sdk.entry.fields.directors.getValue()
            : '',
        topCast:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.topCast
            ? this.props.sdk.entry.fields.topCast.getValue()
            : '',
        releaseDate:
          this.props.sdk.entry &&
          this.props.sdk.entry.fields &&
          this.props.sdk.entry.fields.releaseDate
            ? this.props.sdk.entry.fields.releaseDate.getValue()
            : '',
        runTime:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.runTime
            ? this.props.sdk.entry.fields.runTime.getValue()
            : '',
        rating:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.rating
            ? this.props.sdk.entry.fields.rating.getValue()
            : '',
        genre:
          this.props.sdk.entry && this.props.sdk.entry.fields && this.props.sdk.entry.fields.genre
            ? this.props.sdk.entry.fields.genre.getValue()
            : []
      },
      customGenre: [],
      error: false,
      isLoading: false,
      searchText: '',
      movies: [],
      images: [],
      searched: false,
      cardLoading: true,
      genreInput: ''
    };
    this.timer = null;
  }

  detachExternalChangeHandler = null;

  componentDidMount() {
    this.props.sdk.window.startAutoResizer();
    if (
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'image'
    ) {
      this.fetchPictures(this.props.sdk.parameters.invocation.movieId);
    } else if (
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'custom' &&
      this.props.sdk.parameters.invocation.genre &&
      this.props.sdk.parameters.invocation.genre.length > 0
    ) {
      this.setState({
        customGenre: this.props.sdk.parameters.invocation.genre
      });
    }

    if (
      this.props.sdk.entry &&
      this.props.sdk.entry.fields &&
      this.props.sdk.entry.fields.movieId
    ) {
      let ID = this.state.tmsId;
      if (ID) {
        ID = ID.toLowerCase();
        if (ID.includes('custom') || !ID.includes('mv')) {
          this.setState({
            isCustom: true
          });
        }
      }
    }

    this.timer = setTimeout(() => {
      this.setState({
        cardLoading: false
      });
    }, 500);

    // console.log(this.props.sdk.entry.fields);
    // console.log(this.state);
    // console.log(this.props.sdk.parameters.invocation);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
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
    // console.log(data);
    var movies = [];
    let providers = [];
    let parsed = [];
    if (
      data &&
      data.on &&
      data.on.programAvailabilities &&
      data.on.programAvailabilities.length > 0 &&
      data.on.programAvailabilities[0].programAvailability &&
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

        //Scrub provider name
        let providerTemp =
          catalogName !== undefined && catalogName.length > 0 ? catalogName.join('') : '';
        if (providerTemp.includes('Amazon PV US')) {
          providerTemp = 'Amazon';
        }
        let movie = {
          provider: providerTemp,
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
    if (movie) {
      this.props.sdk.entry.fields.tags.removeValue();
      this.props.sdk.entry.fields.genre.removeValue();
      this.props.sdk.entry.fields.image.removeValue();
      this.props.sdk.entry.fields.movieAvailability.removeValue();
      this.props.sdk.entry.fields.moviePicker.removeValue();
      this.setState({
        movieAvailability: [],
        selectedMovie: movie,
        tmsId: movie.tmsId,
        isCustom: false
      });
      let directors =
        movie.directors !== undefined && movie.directors.length > 0
          ? movie.directors.join(', ')
          : '';
      let topCast =
        movie.cast !== undefined && movie.cast.length > 0
          ? movie.cast.reduce((accum, cast, i) => {
              if (i < 3) {
                accum.push(cast.name);
              }
              return accum;
            }, [])
          : [];
      let duration =
        movie.runTime !== undefined ? moment.duration(movie.runTime, 'minutes').format('mm') : '';
      let rating =
        movie.ratings !== undefined &&
        movie.ratings.length > 0 &&
        movie.ratings[0].code !== undefined
          ? movie.ratings[0].code
          : '';
      let tags = movie.keywords !== undefined ? Object.values(movie.keywords).flat() : [];

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

      let rawAsset;
      if (movie.preferredImage.uri !== undefined) {
        rawAsset = await this.createAssetWithImageUrl(
          movie.preferredImage.uri,
          '',
          this.props.sdk.locales.default,
          movie.title
        );
      }
      this.processAndPublishPoster(rawAsset, this.props.sdk.locales.default);
      if (imagePopup) {
        this.openImageSelect();
      }
      this.props.sdk.notifier.success('Movie successfully saved!');
      this.props.sdk.window.updateHeight(500);
    }
  };

  // Image Search
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
          movieId: this.state.tmsId
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

  // Custom Movie
  openCustomMovie = () => {
    this.props.sdk.dialogs
      .openExtension({
        title: 'Add Custom Movie',
        shouldCloseOnOverlayClick: true,
        parameters: { type: 'custom', ...this.state.customMovie, tmsId: this.state.tmsId }
      })
      .then(data => {
        this.saveCustomMovie(data);
      });
  };

  generateCustomID = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min);
  };

  saveCustomMovie = data => {
    if (data) {
      let {
        title,
        description,
        logLine,
        directors,
        topCast,
        releaseDate,
        rating,
        runTime,
        tmsId,
        genre
      } = data;
      tmsId =
        tmsId && tmsId.includes('CUSTOM') ? tmsId : 'CUSTOM_' + this.generateCustomID(0, 100000000);
      this.setState({
        isCustom: true,
        tmsId,
        customMovie: {
          ...data
        }
      });
      this.props.sdk.entry.fields.title.setValue(title);
      this.props.sdk.entry.fields.adminTitle.setValue(title);
      this.props.sdk.entry.fields.description.setValue(description);
      this.props.sdk.entry.fields.logLine.setValue(logLine);
      this.props.sdk.entry.fields.directors.setValue(directors);
      this.props.sdk.entry.fields.topCast.setValue(topCast);
      if (releaseDate) {
        this.props.sdk.entry.fields.releaseDate.setValue(releaseDate);
      } else {
        this.props.sdk.entry.fields.releaseDate.removeValue();
      }
      this.props.sdk.entry.fields.rating.setValue(rating);
      this.props.sdk.entry.fields.runTime.setValue(runTime);
      if (genre.length > 0) {
        this.props.sdk.entry.fields.genre.setValue(genre);
      }
      this.props.sdk.entry.fields.movieId.setValue(tmsId);
      this.props.sdk.notifier.success('Movie successfully saved!');
    }
  };

  onCustomSubmit = event => {
    event.preventDefault();
    let formData = {
      title: event.target.title.value,
      description: event.target.description.value,
      logLine: event.target.logLine.value,
      directors: event.target.directors.value,
      topCast: event.target.topCast.value,
      releaseDate: event.target.releaseDate.value,
      rating: event.target.rating.value,
      runTime: event.target.runTime.value,
      tmsId: event.target.tmsId.value,
      genre: this.state.customGenre
    };
    // console.log(formData);
    this.props.sdk.close(formData);
  };

  handleGenre = () => {
    if (
      this.state.genreInput &&
      this.state.customGenre &&
      this.state.customGenre.indexOf(this.state.genreInput) === -1
    ) {
      this.setState(
        {
          customGenre: [this.state.genreInput.trim(), ...this.state.customGenre]
        },
        this.setState({
          genreInput: ''
        })
      );
    }
  };

  deleteGenre = genre => {
    if (genre && this.state.customGenre && this.state.customGenre.length > 0) {
      const index = this.state.customGenre.indexOf(genre);
      let genres = [...this.state.customGenre];
      if (index > -1) {
        genres.splice(index, 1);
        this.setState({
          customGenre: genres
        });
      }
    }
  };

  handleGenreInput = e => {
    this.setState({
      genreInput: e.target.value
    });
  };

  render() {
    // console.log(this.state.movies);
    // Create master array of search results
    if (this.state.movies.length > 0) {
      var movies = this.state.movies.map(movie => {
        // console.log(movie);
        let duration = movie.program.runTime
          ? moment.duration(movie.program.runTime, 'minutes').format('mm')
          : '';
        let ratings =
          movie.program.ratings && movie.program.ratings.length > 0 && movie.program.ratings[0].code
            ? movie.program.ratings[0].code
            : '';
        return (
          <Card
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
                {duration && ratings && <span className="year">&nbsp;|&nbsp;{ratings}</span>}
                {!duration && ratings && <span className="year">{ratings}</span>}
                {ratings && movie.program.releaseYear && (
                  <span className="year">&nbsp;|&nbsp;{movie.program.releaseYear}</span>
                )}
                {!movie.program.ratings && !duration && movie.program.releaseYear && (
                  <span className="year">{movie.program.releaseYear}</span>
                )}
                {!movie.program.ratings && duration && movie.program.releaseYear && (
                  <span className="year">&nbsp;|&nbsp;{movie.program.releaseYear}</span>
                )}
              </div>
              <div className="description">{movie.program.shortDescription}</div>
              <div className="lang">Title Language: {movie.program.titleLang.toUpperCase()}</div>
              <div className="lang">
                Description Language: {movie.program.descriptionLang.toUpperCase()}
              </div>
            </div>
          </Card>
        );
      });
    }

    // Create master array of search results
    if (this.state.images.length > 0) {
      var images = this.state.images.map((image, i) => {
        if (image.aspect === '16x9') {
          return (
            <Card
              padding="none"
              key={i}
              className="image-ctn"
              onClick={this.onImageSelect.bind(this, image)}>
              <div className="movie-image">
                <img src={image.uri} />
              </div>
              <div className="image-details">
                <div className="description">
                  {image.category}&nbsp;&#183;&nbsp;{image.aspect}&nbsp;&#183;&nbsp;{image.width} x{' '}
                  {image.height}
                </div>
              </div>
            </Card>
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
            'https://images.ctfassets.net/3m6gg2lxde82/6rjO8gDtwuN0vYOtcjwn7X/219261f2782c8e3c0537761e89cbe7be/netflix.png';
        } else if (providerTemp.includes('hulu')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/1jr1hmTLn4i10yS1VtvPhO/4515e723927fadb54882db90ce75ac20/hulu.png';
        } else if (providerTemp.includes('disney')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/3ACkzU5BItSTmL9MHGQ2yh/e3e0b0805c68e396aa287437aafcfae4/disney.png';
        } else if (providerTemp.includes('vudu')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/1UqkgoLo8OXlGPFpO9pXwK/85e45298c8dc25afabba1e405587d612/vudu.png';
        } else if (providerTemp.includes('youtube')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/3L20OG8Huo0FXp9oISdj3p/d0a864ce42258f1fc31cf6f113794226/youtube.png';
        } else if (providerTemp.includes('amazon')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5Tt2QHfgGOiJPuHalmeur0/aeaa15a97edddc94dac0593e6ce42c9c/amazon.png';
        } else if (providerTemp.includes('itunes')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/7H37IVPPF790DhfQSJP1Ui/ca38ed8722efaa0cbe50f5e32b07d362/itunes.png';
        } else if (providerTemp.includes('hbo') && providerTemp.includes('go')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/6qQUzYMMlNnqmd9Sv1NKGg/2b572d9c54b8ae1114a25cdca9211a15/hbogo.png';
        } else if (providerTemp.includes('hbo') && providerTemp.includes('max')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5a5yd1KhGLAs7W2Fkk8Lj6/9a0f2c10a97cae16b7de410d29a836e5/hbomax.png';
        } else if (providerTemp.includes('hbo')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/5fkw5oXi9SA2cUFmY4Er2d/47172c47db1cf6c75faebb53647e82de/hbo.png';
        } else if (providerTemp.includes('starz')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/1zDRiC4TzanVSaO72M34ED/1ab76757f12b3a5b4b49c1ecd060724d/starz.png';
        } else if (providerTemp.includes('showtime')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/7wdyV1pk52Vi9JPLyXP7RQ/b86f40b7b8d72beaa67975089293a383/showtime.png';
        } else if (providerTemp.includes('tnt')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/6LOuFrsli1onqRddJdqHMp/2078fb4d21bc08f07f90073094a9af5f/tnt.png';
        } else if (providerTemp.includes('tbs')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/42zUZvMNQgMiOy4QGgUpW/e9624a22dafeb0ef3ee937a3416d08cf/tbs.png';
        } else if (providerTemp.includes('google')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/7idK4NkHKDz5y9X0Up69J9/4142201ca29570260493ce3e9219d05b/google.png';
        } else if (providerTemp.includes('usa')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/6Pm4G8uFfIKqQ0xartJSI/ee3aa3a0d2a8792944b135a7199cd888/usa.png';
        } else if (providerTemp.includes('epix')) {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/6Ihc4GdzDDmgp8ojntZl2c/5192e0be73638e87cf4a88845de44b83/epix.png';
        } else {
          imageLink =
            'https://images.ctfassets.net/3m6gg2lxde82/bxMjODx6NyDQe5BBPDyUB/63531e68d813b77518443279d091a28b/generic.png';
        }

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
      let { preferredImage, title, shortDescription, releaseYear } = this.state.selectedMovie;
      let { isCustom } = this.state;

      // let duration = runTime ? moment.duration(runTime, 'minutes').format('mm') : '';
      // let rating = ratings && ratings.length > 0 && ratings[0].code ? ratings[0].code : '';

      return (
        <div className="ctn">
          <Button className="add-button" onClick={this.openMovieSelect}>
            <i className="fas fa-plus"></i> Search Movie
          </Button>
          {!isCustom && !this.state.selectedMovie.tmsId && (
            <Button className="add-button" onClick={this.openCustomMovie}>
              <i className="fas fa-plus"></i> Add Custom Movie
            </Button>
          )}
          {isCustom && !this.state.selectedMovie.tmsId && (
            <Button className="add-button" onClick={this.openCustomMovie}>
              <i className="fas fa-user-edit"></i> Edit Custom Movie
            </Button>
          )}
          {!isCustom && this.state.selectedMovie.tmsId && (
            <Button className="add-button" onClick={this.openImageSelect}>
              <i className="fas fa-images"></i> Select Image
            </Button>
          )}
          {!isCustom && this.state.tmsId && (
            <Button className="add-button" onClick={this.refreshData.bind(this, this.state.tmsId)}>
              <i className="fas fa-sync"></i> Reset Data
            </Button>
          )}
          {isCustom && (
            <Note noteType="warning" testId="cf-ui-note" title="">
              This is a custom movie.
            </Note>
          )}
          {this.state.selectedMovie.preferredImage &&
            this.state.selectedMovie.title &&
            this.state.selectedMovie.shortDescription && (
              <>
                <div className="movie-selected-title">Selected Movie</div>
                <EntryCard
                  title={`${title} (${releaseYear})`}
                  loading={this.state.cardLoading}
                  description={shortDescription}
                  className="movie-selected"
                  size="default"
                  thumbnailElement={<img src={preferredImage.uri} />}></EntryCard>
              </>
            )}
          {this.state.selectedMovie.title && !streamData && (
            <Note noteType="warning" testId="cf-ui-note" title="">
              No streaming data is available for this title at this time.
            </Note>
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
            <TextInput
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
            <Button
              className="search-button"
              onClick={() => {
                this.fetchMovies(this.state.searchText);
              }}>
              <i className="fas fa-search"></i> Search
            </Button>
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
          {!this.state.isLoading && images && images.length > 0 ? (
            <div className="movie-container">{images}</div>
          ) : (
            <h3>No 16x9 images found.</h3>
          )}
        </div>
      );
    } else if (
      this.props.sdk.location.is(locations.LOCATION_DIALOG) &&
      this.props.sdk.parameters.invocation &&
      this.props.sdk.parameters.invocation.type === 'custom'
    ) {
      let {
        title,
        description,
        logLine,
        directors,
        topCast,
        releaseDate,
        rating,
        runTime,
        tmsId
      } = this.props.sdk.parameters.invocation;
      return (
        <div className="custom-container">
          <Form onSubmit={this.onCustomSubmit}>
            <FieldGroup>
              <TextField
                required
                countCharacters
                type="text"
                className="textfield"
                name="title"
                id="nameInput"
                labelText="Title"
                value={title}
                textInputProps={{ maxLength: 255 }}
                width="large"
              />
              <TextField
                required
                textarea
                type="text"
                className="textfield"
                name="description"
                id="descriptionInput"
                labelText="Description"
                value={description}
                width="large"
              />
              <TextField
                required
                countCharacters
                type="text"
                className="textfield"
                name="logLine"
                id="logInput"
                labelText="Logline"
                value={logLine}
                textInputProps={{ maxLength: 255 }}
                width="large"
              />
              <TextField
                countCharacters
                type="text"
                className="textfield"
                name="directors"
                id="directorsInput"
                labelText="Directors"
                value={directors}
                textInputProps={{ maxLength: 255 }}
                width="large"
                helpText="Enter names separated by commas"
              />
              <TextField
                countCharacters
                type="text"
                className="textfield"
                name="topCast"
                id="topCastInput"
                labelText="Top Cast"
                value={topCast}
                textInputProps={{ maxLength: 255 }}
                width="large"
                helpText="Enter names separated by commas"
              />
              <TextField
                required
                className="textfield"
                name="releaseDate"
                id="releaseDateInput"
                labelText="Release Date"
                value={releaseDate}
                width="large"
                textInputProps={{ type: 'date' }}
              />
              <TextField
                required
                type="text"
                className="textfield"
                name="rating"
                id="raingInput"
                labelText="Rating"
                value={rating}
                width="large"
              />
              <TextField
                required
                className="textfield"
                name="runTime"
                id="runtimeInput"
                labelText="Run Time"
                value={runTime}
                width="large"
                textInputProps={{ type: 'number' }}
                helpText="Enter run time in minutes"
              />
              <TextField
                className="textfield"
                name="genre"
                id="genreInput"
                labelText="Genre"
                width="large"
                value={this.state.genreInput}
                textInputProps={{
                  onChange: e => {
                    this.handleGenreInput(e);
                  },
                  onKeyPress: e => {
                    if (event.key === 'Enter') {
                      e.preventDefault();
                      this.handleGenre();
                    }
                  },
                  placeholder: 'Type the value and hit enter'
                }}
              />
              <div className="pill-ctn">
                {this.state.customGenre &&
                  this.state.customGenre.length > 0 &&
                  this.state.customGenre.map((genre, i) => {
                    return (
                      <Pill
                        key={i}
                        className="pill"
                        label={genre}
                        onClose={this.deleteGenre.bind(this, genre)}
                      />
                    );
                  })}
              </div>
              <TextField
                disabled
                type="text"
                className="textfield"
                name="tmsId"
                id="tmsIdInput"
                labelText="Movie ID"
                value={tmsId}
                width="large"
                textInputProps={{ disabled: true }}
              />
            </FieldGroup>
            <FieldGroup>
              <Button type="submit" value="Submit">
                Save Movie
              </Button>
            </FieldGroup>
          </Form>
        </div>
      );
    } else {
      return null;
    }
  }

  static propTypes = {
    sdk: PropTypes.object.isRequired
  };
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
