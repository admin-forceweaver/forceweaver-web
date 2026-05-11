---
title: Deep Clone using Headless Actions in LWC
date: '2021-12-13'
author: ''
excerpt: >-
  A headless quick action executes custom code in a Lightning web component.
  Unlike a screen action, a headless action doesn’t open a modal window.
category: Development
tags:
  - action
  - approval
  - aura
  - clone
  - custom
  - custom-approval
  - deep
  - deep-clone
  - execute-at-background
  - headless
  - headless-action
  - invoke
  - lwc
  - navigationmixin
  - no-aura
  - no-html
  - no-modal
  - no-ui
  - only-javascript
  - quick-action
  - showtoastevent
  - without-aura
featuredImage: images/lwc_headless_feature.png
---
A headless quick action executes custom code in a Lightning web component. Unlike a screen action, a headless action doesn’t open a modal window. So in short, if you want to do some custom logic via apex to run by click of a quick action button we can use headless actions in LWC.

Below are a few examples/use cases where we can implement headless actions.  
1\. A custom clone button (With Deep Clone)  
2\. A custom approval button.  
3\. Submit data to an external system.  
4\. Enrich the record with details from an external system etc.

#### **Configure a Component for Quick Actions**

To use a Lightning web component as a quick action, define the component’s metadata. Specifically to use an LWC as headless action use the below XML for the meta XML file. Note that the <actiontype is Action for a headless quick action and if you would like to enable the component as a screen popup (regular) include actionType as ScreenAction.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
   <apiVersion>52.0</apiVersion>
   <isExposed>true</isExposed>
   <targets>
       <target>lightning__RecordAction</target>
   </targets>
    <targetConfigs>
   <targetConfig targets="lightning__RecordAction">
     <actionType>Action</actionType>
   </targetConfig>
 </targetConfigs>
</LightningComponentBundle>
```

#### Implementation

Now that we have the setup ready, the custom logic that you need to implement must be provided with the js file of the LWC. The HTML file could be empty with just the template tags.  
In your Lightning web component, expose `invoke()` as a public method. The `invoke()` method executes every time the quick action is triggered.

```jscript
import { LightningElement, api } from "lwc";

export default class HeadlessSimple extends LightningElement {
  @api invoke() {
    console.log("This is a headless action.");
  }
}
```

#### Example Scenario

So now if you want to use a deep clone logic from the quick action button the code looks like this.  

```jscript
import { LightningElement, api } from "lwc";
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import { NavigationMixin } from 'lightning/navigation';
import startDeepClone from '@salesforce/apex/ROR_CloneController.startDeepClone';

export default class Ror_deepcloneaction extends NavigationMixin(LightningElement) {

    @api invoke() {
        this.startToast('Deep Clone!','Starting cloning process...');
        //Call the cloning imperative apex js method
        this.startCloning();
    }
    
    startCloning(){
        startDeepClone({recordId: this.recordId})
        .then(result => {
            this.startToast('Deep Clone!','Cloning Process Completed');
            this.navigateToRecord(result);
         })
         .catch(error => {
            this.startToast('Deep Clone!','An Error occured during cloning'+error);
         });
    }

    startToast(title,msg){
        let event = new ShowToastEvent({
            title: title,
            message: msg,
        });
        this.dispatchEvent(event);
    }

    navigateToRecord(clonedRecId){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: clonedRecId,
                actionName: 'view',
            },
        });
    }

}
```

You can see that on click of the quick action button, the invoke method gets executed, that in turn calls the imperative apex call; does the clone; returns the new clone record's id and on a successful return from the apex, use an event to alert the user and use NavigationMixin to redirect the user to the cloned record.

Please access the code from the Github repo [here](https://github.com/arohitu/lwcdeepclone).

![](images/ezgif-3-202a12ec6250.gif)
