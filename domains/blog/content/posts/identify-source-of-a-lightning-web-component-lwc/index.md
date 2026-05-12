---
title: Identify Source of a Lightning Web Component (LWC)
date: '2020-09-08'
author: ''
excerpt: >-
  Many times we may get a scenario where a lwc will be placed in community for
  external users and also in the app builder so that its used by internal users.
category: Development
tags:
  - accessed
  - dynamic
  - lightning-web-component
  - lwc
  - placed
  - source
featuredImage: images/lwcsource_feature-image.pmg_.png
status: published
---
###### Scenario

Many times we may get a scenario where a lwc will be placed in community for external users and also in the app builder so that its used by internal users. Let us see how we can identify from where the component is being accessed now so that we can conditionally render the design/css.

We'll make use of the lifecycle hook **connectedCallback()** to pull this information from an apex to the LWC's javascript.

###### Sample Code

identifysource.html

```xml
<template>
    {isincommunity}
</template>
```

identifysource.js

```jscript
import { LightningElement,track } from 'lwc';
import checkPortalType from '@salesforce/apex/IdentifySource.checkPortalType';
export default class Identifysource extends LightningElement {
	@track isincommunity;
	connectedCallback(){
        checkPortalType()
            .then(result => {
                var isInPortal = result === 'Theme3' ? true : false;
                //setting tracked property value
                this.isincommunity = isInPortal;
            })
            .catch(error => {
                this.error = error;
        });
    }
}
```

IdentifySource.cls

```java
public with sharing class IdentifySource {
    @AuraEnabled
    public static String checkPortalType() {
        return UserInfo.getUiThemeDisplayed();
    }
}
```

###### Background

If you are from the Aura background, you could relate the **connectedCallback()** with the **doInit()**. If you want to perform any logic before the element is rendered, you can add that to the **connectedCallback()** method. The **connectedCallback()** lifecycle hook fires when a component is inserted into the DOM. **connectedCallback()** in Lightning Web Component flows from parent to child. So we call the apex from the **connectedCallback()** method.

Now on the apex side, we have the **UserInfo** class that retrieves the UI Theme of the logged in user. This way we can identify on which theme the user has logged in. Below data shows the output of the **getUiThemeDisplayed()** method.

- Theme1—Obsolete Salesforce theme
- Theme2—Salesforce Classic 2005 user interface theme
- Theme3—Salesforce Classic 2010 user interface theme
- Theme4d—Modern “Lightning Experience” Salesforce theme
- Theme4t—Salesforce mobile app theme
- Theme4u—Lightning Console theme
- PortalDefault—Salesforce Customer Portal theme
- Webstore—Salesforce AppExchange theme
