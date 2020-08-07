import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { TextField } from '@contentful/forma-36-react-components';
import { init } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';

export const App = ({ sdk }) => {
  const [value, setValue] = useState(sdk.field.getValue() || '');

  const onExternalChange = value => {
    setValue(value);
  };

  const onChange = e => {
    const value = e.currentTarget.value;
    setValue(value);
    if (value) {
      sdk.field.setValue(value);
    } else {
      sdk.field.removeValue();
    }
  };

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, []);

  console.log(sdk.user.spaceMembership.admin, sdk);
  let title =
    sdk.parameters.instance.fieldName !== undefined ? sdk.parameters.instance.fieldName : '';
  let helpText =
    sdk.parameters.instance.fieldText !== undefined ? sdk.parameters.instance.fieldText : '';
  let disabled = false;

  if () {
    
  }

  useEffect(() => {
    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    const detatchValueChangeHandler = sdk.field.onValueChanged(onExternalChange);
    return detatchValueChangeHandler;
  });

  return (
    <TextField
      countCharacters
      type="text"
      className="textfield"
      name="directors"
      id="directorsInput"
      labelText={title}
      value={value}
      textInputProps={{ maxLength: 255, disabled: disabled }}
      width="large"
      helpText={helpText}
    />
  );
};

App.propTypes = {
  sdk: PropTypes.object.isRequired
};

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
