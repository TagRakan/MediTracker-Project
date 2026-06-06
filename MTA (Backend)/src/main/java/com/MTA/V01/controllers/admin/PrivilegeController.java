package com.MTA.V01.controllers.admin;

import com.MTA.V01.services.controllers.UserServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/admin/privilege")
public class PrivilegeController {
    @Autowired
    UserServices userServices;

    @GetMapping("/upgrade/{userId}")
    public ResponseEntity<?> upgradeUser(@PathVariable("userId") Long id){
        return userServices.upgradeUser(id);
    }
    @GetMapping("/downgrade/{userId}")
    public ResponseEntity<?> downgradeUser(@PathVariable("userId") Long id){
        return userServices.downgradeUser(id);
    }
}
