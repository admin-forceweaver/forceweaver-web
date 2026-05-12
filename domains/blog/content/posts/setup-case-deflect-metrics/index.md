---
title: Configure Case Deflection Metrics on Community Cloud
date: '2020-03-25'
author: ''
excerpt: >-
  Now that you have built your customer community and customers are flowing into
  the community to view latest products, get help from community members, view
  knowledge articles etc.
category: Tutorial
tags:
  - article-case
  - case-metrics
  - contact-support-form
  - knowledge-effectiveness
  - lightning-community
  - salesforce-community
featuredImage: images/casedeflection_feature.png
status: published
---
Now that you have built your customer community and customers are flowing into the community to view latest products, get help from community members, view knowledge articles etc. In a case to measure the community effectiveness, the community manager wants to generate reports on how well the articles are helping the customers. Community manager wants to see which articles help the customers the most, how many cases were stopped because the customer chose not to create it by seeing an article. To view these metrics, salesforce has a package: 'Salesforce Case Deflection Reporting Package for Lightning Communities'. Below is the link to the package on AppExchange. This package has dashboard that shows insights into how well the Contact Support Form and Case Deflection components actually deflect cases from being created in your Lightning communities.

https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000EtDxwUAF

#### How does this work?

The contact support form component that creates the case record is placed in the lightning community along with the case deflection component. The '**Case Deflection Component**' searches text as it’s being entered into the Contact Support Form component and returns relevant articles and discussions. If users don’t get the answer they need, they can continue with their request for support. This lightningcommunity:deflectionSignal (system event) is fired in a Lightning community when a user is deflected away from creating a customer case. After viewing an article or discussion in a community, the user is asked if the interaction was helpful, and whether they want to stop creating their case.

Let us now look at the below video to understand how we can setup a community using the case deflection metrics. For the purpose of the demo, I will show just one deflection, hence the report and dashboards may not look really great. But it will definitely serve the purpose to understand how to setup case deflection metrics. Lets see what are the essential components that is required to be added to the community.

#### Quick Demo

https://youtu.be/a2P9E-gWosw
