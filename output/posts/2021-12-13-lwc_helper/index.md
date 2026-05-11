---
title: "Aura's Helper Equivalent in LWC"
date: 2021-12-13
categories: 
  - "concepts"
  - "recipes"
tags: 
  - "aura"
  - "equivalent"
  - "helper"
  - "lwc"
  - "reusable-function"
  - "reusable-method"
  - "salesforce"
  - "sfdc"
  - "this"
coverImage: "auras-helper-equivalent-in-lwc.png"
---

Back in time when we were creating Lightning components on aura framework, developers were hooked on with the helper methods. We all were told that all the reusable code should go into helper methods. However when we moved to LWC development, with no helper javscript file, where do we put all these reusable code? Let is take a look.

#### Reusable helpers in LWC

In LWC, we just have one javascript file, so it is necessary to have all the reusable code written within this file. Lets take a quick example of how we can call a method that fires toast message. This method we'll make generic and try to refer from multiple places. Also I've added how to use a pattern matching method as well.

```
import { LightningElement} from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class MyClass extends LightningElement {
    searchTerm = null;
    //Function for maanging toast messages
    showToast(titleMsg,description,variant) {
        const event = new ShowToastEvent({
            title: titleMsg,
            message: description,
            variant : variant
        });
        this.dispatchEvent(event);
    }
    checkNumeric(inputStr){
        let pattern = /^([^0-9]*)$/;
        if(!inputStr.match(pattern)){
            return true;
        }
        else {
            return false;
        }
    }
    validateParam(searchTerm) {
        let searchTermLen = searchTerm.length;
        if (searchTermLen === 0 || searchTermLen > 3) {
            this.showToast('Error','Search Term from must have minimum 1 and maximum 3 characters', 'error');
        }
        else if (searchTermLen === 1) {
            if(this.checkNumeric(searchTerm)){
                //Some Logic
            }
            else {
                this.showToast('Error','First Character of Search starts with Number', 'error');
            }
        }
    }
    //The handler that will executed from the click of search button
    handleSearchClick(event) {
        this.validateParam(this.searchTerm);
            // Do all your logic below
        }
}
```

From the above its evident that on handleSearchClick(), we call the validateParam() method. From the validateParam() method we are calling the showToast() method by passing parameters. The showToast() method based on its input parameter will render the toast message on the UI.

#### 'This' - The magic word!

The key to call reusable code is the use of '_this_' keyword. Functions, in JavaScript, are essentially objects. Like objects they can be assigned to variables, passed to other functions and returned from functions. And much like objects, they have their own properties. One of these properties is '_this_'.

The value that '_this_' stores is the current execution context of the JavaScript program. Thus, when used inside a function _this_‘s value will change depending on how that function is defined, how it is invoked and the default execution context.
